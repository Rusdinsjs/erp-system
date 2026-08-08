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
        let rec = sqlx::query_as::<_, AuditSession>(
            r#"
            INSERT INTO audit_sessions (id, user_id, status, notes, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, status, notes, created_at, closed_at
            "#,
        )
        .bind(session.id)
        .bind(session.user_id)
        .bind(&session.status)
        .bind(&session.notes)
        .bind(session.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_active_session(&self) -> DomainResult<Option<AuditSession>> {
        let rec = sqlx::query_as::<_, AuditSession>(
            r#"
            SELECT id, user_id, status, notes, created_at, closed_at
            FROM audit_sessions
            WHERE status = 'open'
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn close_session(&self, session_id: Uuid) -> DomainResult<AuditSession> {
        let rec = sqlx::query_as::<_, AuditSession>(
            r#"
            UPDATE audit_sessions
            SET status = 'closed', closed_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, status, notes, created_at, closed_at
            "#,
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn add_record(&self, record: &AuditRecord) -> DomainResult<AuditRecord> {
        let rec = sqlx::query_as::<_, AuditRecord>(
            r#"
            INSERT INTO audit_records (id, session_id, asset_id, status, notes, scanned_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, session_id, asset_id, status, notes, scanned_at, 
                      NULL::text as asset_code, NULL::text as asset_name
            "#,
        )
        .bind(record.id)
        .bind(record.session_id)
        .bind(record.asset_id)
        .bind(&record.status)
        .bind(&record.notes)
        .bind(record.scanned_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn get_session_progress(&self, session_id: Uuid) -> DomainResult<(i64, i64)> {
        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM assets WHERE status != 'disposed'")
                .fetch_one(&self.pool)
                .await
                .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        let audited: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM audit_records WHERE session_id = $1")
                .bind(session_id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok((total.0, audited.0))
    }

    /// Find audit logs with filtering and pagination
    pub async fn find_logs(
        &self,
        entity_type: Option<&str>,
        action: Option<&str>,
        user_id: Option<Uuid>,
        entity_id: Option<Uuid>,
        offset: i64,
        limit: i64,
    ) -> DomainResult<Vec<crate::domain::entities::AuditLogEntry>> {
        let query = r#"
            SELECT 
                al.id, 
                al.table_name as entity_type, 
                al.record_id as entity_id, 
                al.action, 
                u.name as user_name,
                al.new_values as changes, 
                al.created_at as timestamp
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 
                ($1::text IS NULL OR al.table_name = $1)
                AND ($2::text IS NULL OR al.action = $2)
                AND ($3::uuid IS NULL OR al.user_id = $3)
                AND ($4::uuid IS NULL OR al.record_id = $4)
            ORDER BY al.created_at DESC
            LIMIT $5 OFFSET $6
        "#;

        let logs = sqlx::query_as::<_, crate::domain::entities::AuditLogEntry>(query)
            .bind(entity_type)
            .bind(action)
            .bind(user_id)
            .bind(entity_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(logs)
    }

    /// Count logs for pagination
    pub async fn count_logs(
        &self,
        entity_type: Option<&str>,
        action: Option<&str>,
        user_id: Option<Uuid>,
        entity_id: Option<Uuid>,
    ) -> DomainResult<i64> {
        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)
            FROM audit_logs
            WHERE 
                ($1::text IS NULL OR table_name = $1)
                AND ($2::text IS NULL OR action = $2)
                AND ($3::uuid IS NULL OR user_id = $3)
                AND ($4::uuid IS NULL OR record_id = $4)
        "#,
        )
        .bind(entity_type)
        .bind(action)
        .bind(user_id)
        .bind(entity_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(count.0)
    }

    pub async fn create_log(
        &self,
        table_name: &str,
        record_id: Uuid,
        action: &str,
        new_values: serde_json::Value,
        user_id: Option<Uuid>,
    ) -> DomainResult<()> {
        sqlx::query(
            r#"
            INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(table_name)
        .bind(record_id)
        .bind(action)
        .bind(new_values)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
