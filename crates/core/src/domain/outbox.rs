//! Transactional Outbox Entities (QKRN-011 & QARC-005)
//!
//! Pure domain types for transactional outbox side-effect events.
//! Persistence operations reside in `infrastructure::repositories::OutboxStore`.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
            OutboxStatus::Pending => "PENDING",
            OutboxStatus::Processing => "PROCESSING",
            OutboxStatus::Completed => "COMPLETED",
            OutboxStatus::Failed => "FAILED",
            OutboxStatus::DeadLetter => "DEAD_LETTER",
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

    /// Record a failed attempt, computing exponential backoff next_attempt_at or transitioning to DeadLetter if max_attempts reached (QEVT-001).
    pub fn mark_failed(&mut self, error: &str) {
        self.attempt_count += 1;
        self.last_error = Some(error.to_string());
        if self.attempt_count >= self.max_attempts {
            self.status = OutboxStatus::DeadLetter.as_str().to_string();
        } else {
            self.status = OutboxStatus::Failed.as_str().to_string();
            let backoff_secs = 5 * (2_i64.pow((self.attempt_count - 1) as u32));
            self.next_attempt_at = Utc::now() + chrono::Duration::seconds(backoff_secs);
        }
    }

    /// Mark outbox entry as completed (QEVT-001).
    pub fn mark_completed(&mut self) {
        self.status = OutboxStatus::Completed.as_str().to_string();
    }
}
