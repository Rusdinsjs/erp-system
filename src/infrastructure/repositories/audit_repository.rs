use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::audit::{AuditRecord, AuditSession};
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct AuditRepository {
    pool: PgPool,
}

impl AuditRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_session(&self, session: &AuditSession) -> DomainResult<AuditSession> {
        sqlx::query_as!(
            AuditSession,
            r#"
            INSERT INTO audit_sessions (id, user_id, status, notes, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, status, notes, created_at, closed_at
            "#,
            session.id,
            session.user_id,
            session.status,
            session.notes,
            session.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn find_active_session(&self) -> DomainResult<Option<AuditSession>> {
        sqlx::query_as!(
            AuditSession,
            r#"
            SELECT id, user_id, status, notes, created_at, closed_at
            FROM audit_sessions
            WHERE status = 'open'
            LIMIT 1
            "#
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn close_session(&self, session_id: Uuid) -> DomainResult<AuditSession> {
        sqlx::query_as!(
            AuditSession,
            r#"
            UPDATE audit_sessions
            SET status = 'closed', closed_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, status, notes, created_at, closed_at
            "#,
            session_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn add_record(&self, record: &AuditRecord) -> DomainResult<AuditRecord> {
        let rec = sqlx::query_as!(
            AuditRecord,
            r#"
            INSERT INTO audit_records (id, session_id, asset_id, status, notes, scanned_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, session_id, asset_id, status, notes, scanned_at, 
                      NULL::text as asset_code, NULL::text as asset_name
            "#,
            record.id,
            record.session_id,
            record.asset_id,
            record.status,
            record.notes,
            record.scanned_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn get_session_progress(&self, session_id: Uuid) -> DomainResult<(i64, i64)> {
        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM assets WHERE status != 'disposed'")
                .fetch_one(&self.pool)
                .await
                .map_err(|e| DomainError::Database(e.to_string()))?;

        let audited: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM audit_records WHERE session_id = $1")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok((total.0, audited.0))
    }
}
