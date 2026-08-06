//! Command Execution Context & Idempotency — QARC-004 & QKRN-006
//!
//! Domain-neutral Execution/Command Context carried into transaction execution bounds:
//!   - `actor_id`     — authenticated user performing the command
//!   - `company_id`   — company scope for execution
//!   - `executed_at`  — wall-clock timestamp for execution
//!   - `source_type`  — source document or entity type (e.g. "INVOICE", "BILL")
//!   - `source_id`    — source document or entity UUID
//!   - `correlation_id` — request-level tracing ID
//!   - `idempotency_key` — unique key clients supply to prevent duplicate executions
//!
//! Kernel UnitOfWork and CommandContext are completely domain-neutral. Domain-specific
//! contexts (such as `AccountingPostingContext`) reside in their respective domain crates.

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;

// ─── CommandContext ───────────────────────────────────────────────────────────

/// Generic, domain-neutral context carried into transactional command operations.
#[derive(Debug, Clone)]
pub struct CommandContext {
    /// Authenticated actor performing the command.
    pub actor_id: Uuid,
    /// Company scope of the command.
    pub company_id: Uuid,
    /// Wall-clock execution timestamp.
    pub executed_at: DateTime<Utc>,
    /// Type of source document/entity.
    pub source_type: String,
    /// ID of the source document/entity.
    pub source_id: Uuid,
    /// Request-level correlation / tracing ID.
    pub correlation_id: String,
    /// Client-supplied idempotency key.
    pub idempotency_key: String,
    /// Deterministic fingerprint of the material command payload.
    pub request_fingerprint: String,
}

impl CommandContext {
    pub fn new(
        actor_id: Uuid,
        company_id: Uuid,
        source_type: impl Into<String>,
        source_id: Uuid,
        correlation_id: impl Into<String>,
        idempotency_key: impl Into<String>,
        request_fingerprint: impl Into<String>,
    ) -> Self {
        Self {
            actor_id,
            company_id,
            executed_at: Utc::now(),
            source_type: source_type.into(),
            source_id,
            correlation_id: correlation_id.into(),
            idempotency_key: idempotency_key.into(),
            request_fingerprint: request_fingerprint.into(),
        }
    }

    /// Derive a deterministic idempotency key from source entity identity.
    pub fn derive_key(source_type: &str, source_id: Uuid, action: &str) -> String {
        format!("{source_type}:{source_id}:{action}")
    }
}

// ─── IdempotencyStore ──────────────────────────────────────────────────────────

/// Atomically reserves an idempotency key inside an active `UnitOfWork`.
pub struct IdempotencyStore;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdempotencyDecision {
    Reserved,
    Completed { outcome: String },
}

impl IdempotencyStore {
    /// Attempt to reserve `key` inside `uow`.
    pub async fn check_and_reserve(
        uow: &mut UnitOfWork,
        ctx: &CommandContext,
    ) -> DomainResult<IdempotencyDecision> {
        let result = sqlx::query(
            r#"
            INSERT INTO idempotency_log
                (idempotency_key, actor_id, company_id, source_type, source_id,
                 correlation_id, request_fingerprint, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSING', NOW())
            ON CONFLICT (idempotency_key) DO NOTHING
            "#,
        )
        .bind(&ctx.idempotency_key)
        .bind(ctx.actor_id)
        .bind(ctx.company_id)
        .bind(&ctx.source_type)
        .bind(ctx.source_id)
        .bind(&ctx.correlation_id)
        .bind(&ctx.request_fingerprint)
        .execute(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        if result.rows_affected() == 0 {
            let row: (String, String, Option<String>, Uuid, Uuid, String) = sqlx::query_as(
                r#"
                    SELECT status, request_fingerprint, outcome, actor_id, company_id, source_type
                    FROM idempotency_log
                    WHERE idempotency_key = $1
                    FOR UPDATE
                    "#,
            )
            .bind(&ctx.idempotency_key)
            .fetch_one(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            if row.1 != ctx.request_fingerprint
                || row.3 != ctx.actor_id
                || row.4 != ctx.company_id
                || row.5 != ctx.source_type
            {
                return Err(DomainError::conflict(
                    "Idempotency key was already used for a materially different command",
                ));
            }

            if row.0 == "COMPLETED" {
                let outcome = row.2.ok_or_else(|| {
                    DomainError::internal("Completed idempotency record has no cached outcome")
                })?;
                return Ok(IdempotencyDecision::Completed { outcome });
            }
            return Err(DomainError::conflict(
                "A concurrent request with the same idempotency key is in progress",
            ));
        }

        Ok(IdempotencyDecision::Reserved)
    }

    /// Mark the idempotency key as COMPLETED with an optional outcome payload.
    pub async fn mark_complete(
        uow: &mut UnitOfWork,
        ctx: &CommandContext,
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
