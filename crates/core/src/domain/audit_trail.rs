//! Append-only Document Audit Trail Entities (QKRN-009 & QARC-005)
//!
//! Pure domain types for document audit events.
//! Persistence operations reside in `infrastructure::repositories::AuditTrailStore`.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── AuditAction ─────────────────────────────────────────────────────────────

/// Standard set of document lifecycle actions recorded in the audit trail.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditAction {
    Create,
    Update,
    Submit,
    Post,
    Cancel,
    Amend,
    Approve,
    Reject,
    Reopen,
    Delete,
    /// Any custom action not covered above (store the label in `reason`).
    Custom,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::Create => "CREATE",
            AuditAction::Update => "UPDATE",
            AuditAction::Submit => "SUBMIT",
            AuditAction::Post => "POST",
            AuditAction::Cancel => "CANCEL",
            AuditAction::Amend => "AMEND",
            AuditAction::Approve => "APPROVE",
            AuditAction::Reject => "REJECT",
            AuditAction::Reopen => "REOPEN",
            AuditAction::Delete => "DELETE",
            AuditAction::Custom => "CUSTOM",
        }
    }
}

// ─── DocumentAuditEntry ───────────────────────────────────────────────────────

/// A single immutable row in `document_audit_trail` (QKRN-009).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentAuditEntry {
    pub id: Uuid,
    pub document_id: Uuid,
    pub document_type: String,
    pub action: String,
    pub actor_id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub from_status: Option<String>,
    pub to_status: Option<String>,
    pub document_version: i32,
    pub reason: Option<String>,
    pub correlation_id: String,
    pub recorded_at: DateTime<Utc>,
}

impl DocumentAuditEntry {
    /// Construct a new audit entry.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        action: AuditAction,
        actor_id: Uuid,
        tenant_id: Uuid,
        company_id: Option<Uuid>,
        document_id: Uuid,
        document_type: impl Into<String>,
        from_status: Option<&str>,
        to_status: Option<&str>,
        document_version: i32,
        reason: Option<String>,
        correlation_id: impl Into<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            document_id,
            document_type: document_type.into(),
            action: action.as_str().to_string(),
            actor_id,
            tenant_id,
            company_id,
            from_status: from_status.map(str::to_string),
            to_status: to_status.map(str::to_string),
            document_version,
            reason,
            correlation_id: correlation_id.into(),
            recorded_at: Utc::now(),
        }
    }
}
