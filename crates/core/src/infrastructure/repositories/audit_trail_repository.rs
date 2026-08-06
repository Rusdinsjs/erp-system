//! Audit Trail Repository Implementation (QARC-005)
//!
//! Persistence store for append-only document audit log.

use crate::domain::audit_trail::DocumentAuditEntry;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;

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
