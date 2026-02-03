//! Conversion Repository

use crate::domain::entities::conversion::AssetConversion;
use crate::shared::errors::AppError;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ConversionRepository {
    pool: PgPool,
}

impl ConversionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, conversion: &AssetConversion) -> Result<AssetConversion, AppError> {
        let rec = sqlx::query_as!(
            AssetConversion,
            r#"
            INSERT INTO asset_conversions (
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, request_date, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING 
                id,
                request_number,
                asset_id,
                title,
                status,
                from_category_id,
                to_category_id,
                target_specifications,
                conversion_cost as "conversion_cost!",
                cost_treatment,
                reason,
                notes,
                requested_by,
                approved_by,
                executed_by,
                request_date,
                approval_date,
                execution_date,
                created_at as "created_at!",
                updated_at as "updated_at!"
            "#,
            conversion.id,
            conversion.request_number,
            conversion.asset_id,
            conversion.title,
            conversion.status,
            conversion.from_category_id,
            conversion.to_category_id,
            conversion.target_specifications,
            conversion.conversion_cost,
            conversion.cost_treatment,
            conversion.reason,
            conversion.notes,
            conversion.requested_by,
            conversion.request_date,
            conversion.created_at,
            conversion.updated_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<AssetConversion>, AppError> {
        let rec = sqlx::query_as!(
            AssetConversion,
            r#"
            SELECT
                id,
                request_number,
                asset_id,
                title,
                status,
                from_category_id,
                to_category_id,
                target_specifications,
                conversion_cost as "conversion_cost!",
                cost_treatment,
                reason,
                notes,
                requested_by,
                approved_by,
                executed_by,
                request_date,
                approval_date,
                execution_date,
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM asset_conversions
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_asset_id(&self, asset_id: Uuid) -> Result<Vec<AssetConversion>, AppError> {
        let recs = sqlx::query_as!(
            AssetConversion,
            r#"
            SELECT
                id,
                request_number,
                asset_id,
                title,
                status,
                from_category_id,
                to_category_id,
                target_specifications,
                conversion_cost as "conversion_cost!",
                cost_treatment,
                reason,
                notes,
                requested_by,
                approved_by,
                executed_by,
                request_date,
                approval_date,
                execution_date,
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM asset_conversions
            WHERE asset_id = $1
            ORDER BY created_at DESC
            "#,
            asset_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn find_pending(&self) -> Result<Vec<AssetConversion>, AppError> {
        let recs = sqlx::query_as!(
            AssetConversion,
            r#"
            SELECT
                id,
                request_number,
                asset_id,
                title,
                status,
                from_category_id,
                to_category_id,
                target_specifications,
                conversion_cost as "conversion_cost!",
                cost_treatment,
                reason,
                notes,
                requested_by,
                approved_by,
                executed_by,
                request_date,
                approval_date,
                execution_date,
                created_at as "created_at!",
                updated_at as "updated_at!"
            FROM asset_conversions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn update(&self, conversion: &AssetConversion) -> Result<AssetConversion, AppError> {
        let rec = sqlx::query_as!(
            AssetConversion,
            r#"
            UPDATE asset_conversions
            SET 
                status = $2,
                approved_by = $3,
                approval_date = $4,
                executed_by = $5,
                execution_date = $6,
                target_specifications = $7,
                notes = $8,
                updated_at = $9
            WHERE id = $1
            RETURNING 
                id,
                request_number,
                asset_id,
                title,
                status,
                from_category_id,
                to_category_id,
                target_specifications,
                conversion_cost as "conversion_cost!",
                cost_treatment,
                reason,
                notes,
                requested_by,
                approved_by,
                executed_by,
                request_date,
                approval_date,
                execution_date,
                created_at as "created_at!",
                updated_at as "updated_at!"
            "#,
            conversion.id,
            conversion.status,
            conversion.approved_by,
            conversion.approval_date,
            conversion.executed_by,
            conversion.execution_date,
            conversion.target_specifications,
            conversion.notes,
            conversion.updated_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    // For counting pending reqs (for dashboards)
    pub async fn count_pending(&self) -> Result<i64, AppError> {
        let count = sqlx::query!(
            r#"SELECT COUNT(*) as count FROM asset_conversions WHERE status = 'pending'"#
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .count
        .unwrap_or(0);

        Ok(count)
    }
}
