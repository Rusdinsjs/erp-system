//! Posting Context & Idempotency — QKRN-006
//!
//! Every submit/post action carries:
//!   - `actor_id`     — authenticated user performing the action
//!   - `company_id`   — company scope for the posting
//!   - `posting_at`   — wall-clock timestamp for the ledger entry date
//!   - `source_type`  — the source document type (e.g. "INVOICE", "BILL")
//!   - `source_id`    — the source document UUID
//!   - `correlation_id` — request-level tracing ID
//!   - `idempotency_key` — unique key clients supply to prevent duplicate posts
//!
//! The idempotency key is stored in the `idempotency_log` table (see migration
//! `migrations/XXXX_qkrn006_idempotency_log.sql`). Before executing a post
//! operation the service calls `IdempotencyStore::check_and_reserve`, which
//! atomically inserts the key inside the active `UnitOfWork` transaction.
//! A duplicate key returns `DomainError::Conflict` so the caller can return
//! the cached outcome instead of re-executing.

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;

// ─── PostingContext ────────────────────────────────────────────────────────────

/// Immutable context carried into every ledger-posting business operation.
#[derive(Debug, Clone)]
pub struct PostingContext {
    /// Authenticated actor performing the post.
    pub actor_id: Uuid,
    /// Company scope of the posting.
    pub company_id: Uuid,
    /// Wall-clock time used as the posting/accounting date.
    pub posting_at: DateTime<Utc>,
    /// Type of source document (e.g. `"INVOICE"`, `"BILL"`, `"EXPENSE"`).
    pub source_type: String,
    /// ID of the source document.
    pub source_id: Uuid,
    /// Request-level correlation / tracing ID.
    pub correlation_id: String,
    /// Client-supplied idempotency key (UUID or opaque string ≤ 128 chars).
    pub idempotency_key: String,
}

impl PostingContext {
    /// Create a new `PostingContext`.
    ///
    /// `idempotency_key` should be supplied by the client (e.g. from the
    /// `Idempotency-Key` HTTP header) or generated deterministically from
    /// the source document identity.
    pub fn new(
        actor_id: Uuid,
        company_id: Uuid,
        source_type: impl Into<String>,
        source_id: Uuid,
        correlation_id: impl Into<String>,
        idempotency_key: impl Into<String>,
    ) -> Self {
        Self {
            actor_id,
            company_id,
            posting_at: Utc::now(),
            source_type: source_type.into(),
            source_id,
            correlation_id: correlation_id.into(),
            idempotency_key: idempotency_key.into(),
        }
    }

    /// Derive a deterministic idempotency key from source document identity.
    ///
    /// Use when the client does not supply an explicit key.
    pub fn derive_key(source_type: &str, source_id: Uuid, action: &str) -> String {
        format!("{source_type}:{source_id}:{action}")
    }
}

// ─── IdempotencyStore ──────────────────────────────────────────────────────────

/// Atomically reserves an idempotency key inside an active `UnitOfWork`.
///
/// The underlying table is `idempotency_log` (created by migration
/// `QKRN-006`). The row records actor, source document and the resolved
/// outcome once known.
pub struct IdempotencyStore;

impl IdempotencyStore {
    /// Attempt to reserve `key` inside `uow`.
    ///
    /// # Returns
    /// - `Ok(true)` — key was successfully reserved; proceed with the operation.
    /// - `Ok(false)` — key already exists and the prior attempt **completed**
    ///   (i.e. the operation is a confirmed duplicate); the caller should
    ///   return the cached result.
    /// - `Err(DomainError::Conflict)` — key exists but the prior attempt is
    ///   still **in-progress** (concurrent duplicate); the caller should
    ///   respond with 409 Conflict.
    /// - `Err(…)` — database error.
    ///
    /// # Usage
    ///
    /// Call this at the **start** of a post handler, inside the UoW transaction,
    /// before any other writes:
    ///
    /// ```rust,ignore
    /// let mut uow = UnitOfWork::begin(&pool).await?;
    /// let reserved = IdempotencyStore::check_and_reserve(&mut uow, &ctx).await?;
    /// if !reserved {
    ///     uow.rollback().await?;
    ///     return Ok(cached_response);
    /// }
    /// // ... do work ...
    /// IdempotencyStore::mark_complete(&mut uow, &ctx, "ok").await?;
    /// uow.commit().await?;
    /// ```
    pub async fn check_and_reserve(
        uow: &mut UnitOfWork,
        ctx: &PostingContext,
    ) -> DomainResult<bool> {
        // INSERT … ON CONFLICT DO NOTHING — returns the inserted row count.
        let result = sqlx::query(
            r#"
            INSERT INTO idempotency_log
                (idempotency_key, actor_id, company_id, source_type, source_id,
                 correlation_id, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSING', NOW())
            ON CONFLICT (idempotency_key) DO NOTHING
            "#,
        )
        .bind(&ctx.idempotency_key)
        .bind(ctx.actor_id)
        .bind(ctx.company_id)
        .bind(&ctx.source_type)
        .bind(ctx.source_id)
        .bind(&ctx.correlation_id)
        .execute(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            // Row already exists — check its status.
            let row: (String,) = sqlx::query_as(
                "SELECT status FROM idempotency_log WHERE idempotency_key = $1",
            )
            .bind(&ctx.idempotency_key)
            .fetch_one(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            if row.0 == "COMPLETED" {
                return Ok(false); // safe duplicate — return cached result
            }
            // PROCESSING → concurrent duplicate
            return Err(DomainError::conflict(
                "A concurrent request with the same idempotency key is in progress",
            ));
        }

        Ok(true) // freshly reserved
    }

    /// Mark the idempotency key as COMPLETED with an optional outcome payload.
    ///
    /// Call this **after** all writes succeed, still inside the same `uow`
    /// transaction, so commit/rollback atomically resolves the key status.
    pub async fn mark_complete(
        uow: &mut UnitOfWork,
        ctx: &PostingContext,
        outcome: &str,
    ) -> DomainResult<()> {
        sqlx::query(
            r#"
            UPDATE idempotency_log
            SET status = 'COMPLETED', outcome = $2, completed_at = NOW()
            WHERE idempotency_key = $1
            "#,
        )
        .bind(&ctx.idempotency_key)
        .bind(outcome)
        .execute(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
