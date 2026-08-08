//! Lifecycle Repository
//!
//! Database operations for asset lifecycle history and transitions.

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{AssetState, LifecycleHistory};
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct LifecycleRepository {
    pool: PgPool,
}

impl LifecycleRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Record a state transition in history
    pub async fn record_transition(
        &self,
        asset_id: Uuid,
        from_state: &AssetState,
        to_state: &AssetState,
        reason: Option<String>,
        performed_by: Option<Uuid>,
        metadata: Option<serde_json::Value>,
    ) -> DomainResult<LifecycleHistory> {
        let record = sqlx::query_as::<_, LifecycleHistory>(
            r#"
            INSERT INTO asset_lifecycle_history (id, asset_id, from_state, to_state, reason, performed_by, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, asset_id, from_state, to_state, reason, performed_by, metadata, created_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(asset_id)
        .bind(from_state.as_str())
        .bind(to_state.as_str())
        .bind(reason)
        .bind(performed_by)
        .bind(metadata)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Get lifecycle history for an asset
    pub async fn get_history(&self, asset_id: Uuid) -> DomainResult<Vec<LifecycleHistory>> {
        let records = sqlx::query_as::<_, LifecycleHistory>(
            r#"
            SELECT id, asset_id, from_state, to_state, reason, performed_by, metadata, created_at
            FROM asset_lifecycle_history
            WHERE asset_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(records)
    }

    /// Update asset status in the assets table
    pub async fn update_asset_status(&self, asset_id: Uuid, new_status: &str) -> DomainResult<()> {
        sqlx::query(r#"UPDATE assets SET status = $1, updated_at = NOW() WHERE id = $2"#)
            .bind(new_status)
            .bind(asset_id)
            .execute(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn get_asset_status(&self, asset_id: Uuid) -> DomainResult<String> {
        let result: Option<String> = sqlx::query_scalar(r#"SELECT status FROM assets WHERE id = $1"#)
            .bind(asset_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        result.ok_or_else(|| DomainError::not_found("Asset", asset_id))
    }

    /// Get current asset status and name
    pub async fn get_asset_status_and_name(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<(String, String)> {
        use sqlx::Row;
        let row = sqlx::query(r#"SELECT status, name FROM assets WHERE id = $1"#)
            .bind(asset_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        let status: Option<String> = row.try_get("status").ok();
        let name: String = row.try_get("name").unwrap_or_default();

        match status {
            Some(s) => Ok((s, name)),
            None => Err(DomainError::not_found("Asset", asset_id)),
        }
    }
}
