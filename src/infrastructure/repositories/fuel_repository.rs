//! Fuel Repository

// use chrono::Utc;
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::FuelLog;

#[derive(Clone)]
pub struct FuelRepository {
    pool: PgPool,
}

impl FuelRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<FuelLog>, sqlx::Error> {
        sqlx::query_as::<_, FuelLog>(
            r#"
            SELECT f.*, a.name as asset_name, u.name as requester_name
            FROM fuel_logs f
            LEFT JOIN assets a ON f.asset_id = a.id
            LEFT JOIN users u ON f.requested_by = u.id
            WHERE f.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<FuelLog>, sqlx::Error> {
        sqlx::query_as::<_, FuelLog>(
            r#"
            SELECT f.*, a.name as asset_name, u.name as requester_name
            FROM fuel_logs f
            LEFT JOIN assets a ON f.asset_id = a.id
            LEFT JOIN users u ON f.requested_by = u.id
            ORDER BY f.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_pending(&self) -> Result<Vec<FuelLog>, sqlx::Error> {
        sqlx::query_as::<_, FuelLog>(
            r#"
            SELECT f.*, a.name as asset_name, u.name as requester_name
            FROM fuel_logs f
            LEFT JOIN assets a ON f.asset_id = a.id
            LEFT JOIN users u ON f.requested_by = u.id
            WHERE f.status = 'requested'
            ORDER BY f.created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(&self, log: &FuelLog) -> Result<FuelLog, sqlx::Error> {
        sqlx::query_as::<_, FuelLog>(
            r#"
            INSERT INTO fuel_logs (
                id, tracking_number, asset_id, requested_by, driver_id,
                odometer_reading, odometer_image_url, request_type, requested_value,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(log.id)
        .bind(&log.tracking_number)
        .bind(log.asset_id)
        .bind(log.requested_by)
        .bind(log.driver_id)
        .bind(log.odometer_reading)
        .bind(&log.odometer_image_url)
        .bind(&log.request_type)
        .bind(log.requested_value)
        .bind(&log.status)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn approve(
        &self,
        id: Uuid,
        approved_by: Uuid,
        coupon_code: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE fuel_logs 
            SET status = 'approved', approved_by = $2, coupon_code = $3, approved_at = NOW(), updated_at = NOW() 
            WHERE id = $1 AND status = 'requested'
            "#,
        )
        .bind(id)
        .bind(approved_by)
        .bind(coupon_code)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn reject(&self, id: Uuid, reason: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE fuel_logs 
            SET status = 'rejected', rejection_reason = $2, updated_at = NOW() 
            WHERE id = $1 AND status = 'requested'
            "#,
        )
        .bind(id)
        .bind(reason)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn complete(
        &self,
        id: Uuid,
        actual_filled_amount: Decimal,
        actual_volume: Option<Decimal>,
        receipt_image_url: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE fuel_logs 
            SET status = 'completed', 
                actual_filled_amount = $2, 
                actual_volume = $3, 
                receipt_image_url = $4,
                completed_at = NOW(), 
                updated_at = NOW() 
            WHERE id = $1 AND status = 'approved'
            "#,
        )
        .bind(id)
        .bind(actual_filled_amount)
        .bind(actual_volume)
        .bind(receipt_image_url)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
    pub async fn get_dashboard_stats(&self) -> Result<Vec<(String, i64)>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (String, i64)>(
            r#"
            SELECT status, COUNT(*) as count 
            FROM fuel_logs 
            GROUP BY status
            "#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }
    pub async fn list_by_user(&self, user_id: Uuid) -> Result<Vec<FuelLog>, sqlx::Error> {
        sqlx::query_as::<_, FuelLog>(
            r#"
            SELECT f.*, a.name as asset_name, u.name as requester_name
            FROM fuel_logs f
            LEFT JOIN assets a ON f.asset_id = a.id
            LEFT JOIN users u ON f.requested_by = u.id
            WHERE f.requested_by = $1
            ORDER BY f.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }
}
