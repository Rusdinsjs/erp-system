//! Transactional Outbox — QKRN-011
//!
//! Persists async side-effect events (e.g. email, webhook, GL notification)
//! in the **same** database transaction as state changes, guaranteeing
//! at-least-once delivery without distributed transactions.
//!
//! # How it works
//!
//! 1. A business service appends an `OutboxEntry` via `OutboxStore::append`
//!    inside the active `UnitOfWork` transaction.
//! 2. On commit the outbox row is durable in the DB.
//! 3. A background dispatcher (`OutboxDispatcher`, run separately) polls
//!    `PENDING` rows, delivers them, and marks them `COMPLETED` or `FAILED`.
//! 4. Rows that exceed `max_attempts` move to `DEAD_LETTER` status.
//!
//! # Important
//! The outbox is for **async side effects only** (notifications, webhooks,
//! external integrations). Synchronous GL/stock posting that must complete
//! for business consistency does NOT go through the outbox.
//!
//! # Usage
//!
//! ```rust,ignore
//! let entry = OutboxEntry::new(
//!     "invoice.posted",
//!     &payload_json,
//!     &ctx,
//! );
//! OutboxStore::append(&mut uow, &entry).await?;
//! uow.commit().await?;
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;

// ─── OutboxStatus ─────────────────────────────────────────────────────────────

/// Delivery lifecycle of a single outbox row.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OutboxStatus {
    /// Awaiting dispatch.
    Pending,
    /// Dispatcher has picked up and is attempting delivery.
    Processing,
    /// Successfully delivered.
    Completed,
    /// At least one attempt failed; will be retried.
    Failed,
    /// Exceeded max attempts; requires manual intervention.
    DeadLetter,
}

impl OutboxStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OutboxStatus::Pending     => "PENDING",
            OutboxStatus::Processing  => "PROCESSING",
            OutboxStatus::Completed   => "COMPLETED",
            OutboxStatus::Failed      => "FAILED",
            OutboxStatus::DeadLetter  => "DEAD_LETTER",
        }
    }
}

// ─── OutboxEntry ──────────────────────────────────────────────────────────────

/// A single row in the `outbox` table (QKRN-011).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxEntry {
    pub id: Uuid,
    /// Domain event type / topic, e.g. `"invoice.posted"`, `"payment.completed"`.
    pub event_type: String,
    /// JSON-serialized event payload.
    pub payload: String,
    /// Source document type (for traceability).
    pub source_type: String,
    /// Source document UUID (for traceability).
    pub source_id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub correlation_id: String,
    pub status: String,
    pub attempt_count: i32,
    pub max_attempts: i32,
    pub next_attempt_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_error: Option<String>,
}

impl OutboxEntry {
    /// Create a new `PENDING` outbox entry with default retry settings.
    ///
    /// `max_attempts` defaults to 5 with the first attempt due immediately.
    pub fn new(
        event_type: impl Into<String>,
        payload: &serde_json::Value,
        source_type: impl Into<String>,
        source_id: Uuid,
        tenant_id: Uuid,
        company_id: Option<Uuid>,
        correlation_id: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            event_type: event_type.into(),
            payload: payload.to_string(),
            source_type: source_type.into(),
            source_id,
            tenant_id,
            company_id,
            correlation_id: correlation_id.into(),
            status: OutboxStatus::Pending.as_str().to_string(),
            attempt_count: 0,
            max_attempts: 5,
            next_attempt_at: now,
            created_at: now,
            last_error: None,
        }
    }

    /// Override max retry attempts (default: 5).
    pub fn with_max_attempts(mut self, n: i32) -> Self {
        self.max_attempts = n;
        self
    }
}

// ─── OutboxStore ──────────────────────────────────────────────────────────────

/// Persists and queries outbox entries.
pub struct OutboxStore;

impl OutboxStore {
    /// Append an outbox entry inside the active `UnitOfWork` transaction.
    ///
    /// This is the only write path exposed by `OutboxStore`. Dispatching
    /// and status updates are handled by the background `OutboxDispatcher`.
    pub async fn append(uow: &mut UnitOfWork, entry: &OutboxEntry) -> DomainResult<()> {
        sqlx::query(
            r#"
            INSERT INTO outbox
                (id, event_type, payload, source_type, source_id,
                 tenant_id, company_id, correlation_id,
                 status, attempt_count, max_attempts, next_attempt_at,
                 created_at, last_error)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            "#,
        )
        .bind(entry.id)
        .bind(&entry.event_type)
        .bind(&entry.payload)
        .bind(&entry.source_type)
        .bind(entry.source_id)
        .bind(entry.tenant_id)
        .bind(entry.company_id)
        .bind(&entry.correlation_id)
        .bind(&entry.status)
        .bind(entry.attempt_count)
        .bind(entry.max_attempts)
        .bind(entry.next_attempt_at)
        .bind(entry.created_at)
        .bind(&entry.last_error)
        .execute(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
