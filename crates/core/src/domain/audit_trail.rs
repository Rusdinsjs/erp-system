//! Append-only Document Audit Trail — QKRN-009
//!
//! Records every state-change action on an ERP document: actor, action,
//! document identity, version/status transition, and reason.
//!
//! The `document_audit_trail` table is append-only — ordinary application
//! roles (app_role) have INSERT + SELECT but NO UPDATE or DELETE. This is
//! enforced at both the database level (REVOKE UPDATE, DELETE) and here by
//! never exposing mutation methods.
//!
//! # Usage
//!
//! ```rust,ignore
//! use crate::domain::audit_trail::{AuditAction, DocumentAuditEntry};
//!
//! let entry = DocumentAuditEntry::new(
//!     AuditAction::Submit,
//!     &request_ctx,
//!     doc.document_id(),
//!     "INVOICE",
//!     old_status.as_str(),
//!     new_status.as_str(),
//!     doc.version(),
//!     None,
//! );
//! // Persist inside the same UnitOfWork transaction (QKRN-005).
//! AuditTrailStore::append(&mut uow, &entry).await?;
//! ```

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
            AuditAction::Create  => "CREATE",
            AuditAction::Update  => "UPDATE",
            AuditAction::Submit  => "SUBMIT",
            AuditAction::Post    => "POST",
            AuditAction::Cancel  => "CANCEL",
            AuditAction::Amend   => "AMEND",
            AuditAction::Approve => "APPROVE",
            AuditAction::Reject  => "REJECT",
            AuditAction::Reopen  => "REOPEN",
            AuditAction::Delete  => "DELETE",
            AuditAction::Custom  => "CUSTOM",
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

// ─── AuditTrailStore ─────────────────────────────────────────────────────────

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;

/// Appends audit entries to `document_audit_trail`.
///
/// All operations are INSERT-only. There are no update or delete methods.
pub struct AuditTrailStore;

impl AuditTrailStore {
    /// Append a single audit entry inside the active `UnitOfWork` transaction.
    pub async fn append(uow: &mut UnitOfWork, entry: &DocumentAuditEntry) -> DomainResult<()> {
        sqlx::query(
            r#"
            INSERT INTO document_audit_trail
                (id, document_id, document_type, action, actor_id, tenant_id, company_id,
                 from_status, to_status, document_version, reason, correlation_id, recorded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
        )
        .bind(entry.id)
        .bind(entry.document_id)
        .bind(&entry.document_type)
        .bind(&entry.action)
        .bind(entry.actor_id)
        .bind(entry.tenant_id)
        .bind(entry.company_id)
        .bind(&entry.from_status)
        .bind(&entry.to_status)
        .bind(entry.document_version)
        .bind(&entry.reason)
        .bind(&entry.correlation_id)
        .bind(entry.recorded_at)
        .execute(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
