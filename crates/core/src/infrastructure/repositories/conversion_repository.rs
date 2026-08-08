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
        let rec = sqlx::query_as::<_, AssetConversion>(
            r#"
            INSERT INTO asset_conversions (
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, request_date, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING 
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, approved_by, executed_by,
                request_date, approval_date, execution_date,
                created_at, updated_at
            "#,
        )
        .bind(conversion.id)
        .bind(&conversion.request_number)
        .bind(conversion.asset_id)
        .bind(&conversion.title)
        .bind(&conversion.status)
        .bind(conversion.from_category_id)
        .bind(conversion.to_category_id)
        .bind(&conversion.target_specifications)
        .bind(conversion.conversion_cost)
        .bind(&conversion.cost_treatment)
        .bind(&conversion.reason)
        .bind(&conversion.notes)
        .bind(conversion.requested_by)
        .bind(conversion.request_date)
        .bind(conversion.created_at)
        .bind(conversion.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<AssetConversion>, AppError> {
        let rec = sqlx::query_as::<_, AssetConversion>(
            r#"
            SELECT
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, approved_by, executed_by,
                request_date, approval_date, execution_date,
                created_at, updated_at
            FROM asset_conversions
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_asset_id(&self, asset_id: Uuid) -> Result<Vec<AssetConversion>, AppError> {
        let recs = sqlx::query_as::<_, AssetConversion>(
            r#"
            SELECT
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, approved_by, executed_by,
                request_date, approval_date, execution_date,
                created_at, updated_at
            FROM asset_conversions
            WHERE asset_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn find_pending(&self) -> Result<Vec<AssetConversion>, AppError> {
        let recs = sqlx::query_as::<_, AssetConversion>(
            r#"
            SELECT
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, approved_by, executed_by,
                request_date, approval_date, execution_date,
                created_at, updated_at
            FROM asset_conversions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn update(&self, conversion: &AssetConversion) -> Result<AssetConversion, AppError> {
        let rec = sqlx::query_as::<_, AssetConversion>(
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
                id, request_number, asset_id, title, status,
                from_category_id, to_category_id, target_specifications,
                conversion_cost, cost_treatment, reason, notes,
                requested_by, approved_by, executed_by,
                request_date, approval_date, execution_date,
                created_at, updated_at
            "#,
        )
        .bind(conversion.id)
        .bind(&conversion.status)
        .bind(conversion.approved_by)
        .bind(conversion.approval_date)
        .bind(conversion.executed_by)
        .bind(conversion.execution_date)
        .bind(&conversion.target_specifications)
        .bind(&conversion.notes)
        .bind(conversion.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(rec)
    }

    // For counting pending reqs (for dashboards)
    pub async fn count_pending(&self) -> Result<i64, AppError> {
        let count: Option<i64> = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM asset_conversions WHERE status = 'pending'"#
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?;

        Ok(count.unwrap_or(0))
    }
}
