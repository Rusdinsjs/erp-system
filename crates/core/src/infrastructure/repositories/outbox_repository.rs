//! Outbox Repository Implementation (QARC-005)
//!
//! Persistence store for transactional outbox pattern.

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::outbox::OutboxEntry;
use crate::infrastructure::database::UnitOfWork;

pub struct OutboxStore;

impl OutboxStore {
    /// Append an outbox entry inside the active `UnitOfWork` transaction.
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
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
