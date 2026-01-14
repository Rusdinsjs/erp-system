//! Maintenance Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{MaintenanceRecord, MaintenanceSummary};

#[derive(Clone)]
pub struct MaintenanceRepository {
    pool: PgPool,
}

impl MaintenanceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<MaintenanceRecord>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>("SELECT * FROM maintenance_records WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT 
                m.id, m.asset_id, m.maintenance_type_id, m.scheduled_date, m.actual_date, m.status, m.cost,
                a.name as asset_name,
                t.name as type_name
            FROM maintenance_records m
            LEFT JOIN assets a ON m.asset_id = a.id
            LEFT JOIN maintenance_types t ON m.maintenance_type_id = t.id
            ORDER BY m.scheduled_date DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_by_date_range(
        &self,
        start_date: chrono::NaiveDate,
        end_date: chrono::NaiveDate,
    ) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT 
                m.id, m.asset_id, m.maintenance_type_id, m.scheduled_date, m.actual_date, m.status, m.cost,
                a.name as asset_name,
                t.name as type_name
            FROM maintenance_records m
            LEFT JOIN assets a ON m.asset_id = a.id
            LEFT JOIN maintenance_types t ON m.maintenance_type_id = t.id
            WHERE m.scheduled_date BETWEEN $1 AND $2
            ORDER BY m.scheduled_date DESC
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_asset(
        &self,
        asset_id: Uuid,
    ) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT 
                m.id, m.asset_id, m.maintenance_type_id, m.scheduled_date, m.actual_date, m.status, m.cost,
                a.name as asset_name,
                t.name as type_name
            FROM maintenance_records m
            LEFT JOIN assets a ON m.asset_id = a.id
            LEFT JOIN maintenance_types t ON m.maintenance_type_id = t.id
            WHERE m.asset_id = $1
            ORDER BY m.scheduled_date DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_overdue(&self) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT 
                m.id, m.asset_id, m.maintenance_type_id, m.scheduled_date, m.actual_date, m.status, m.cost,
                a.name as asset_name,
                t.name as type_name
            FROM maintenance_records m
            LEFT JOIN assets a ON m.asset_id = a.id
            LEFT JOIN maintenance_types t ON m.maintenance_type_id = t.id
            WHERE m.scheduled_date < CURRENT_DATE AND m.status NOT IN ('completed', 'cancelled')
            ORDER BY m.scheduled_date
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(
        &self,
        record: &MaintenanceRecord,
    ) -> Result<MaintenanceRecord, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>(
            r#"
            INSERT INTO maintenance_records (
                id, asset_id, maintenance_type_id, scheduled_date, actual_date,
                description, findings, actions_taken, cost, currency_id,
                performed_by, vendor_id, assigned_to, status, approval_status,
                cost_threshold_exceeded, next_service_date, odometer_reading, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
            "#,
        )
        .bind(record.id)
        .bind(record.asset_id)
        .bind(record.maintenance_type_id)
        .bind(record.scheduled_date)
        .bind(record.actual_date)
        .bind(&record.description)
        .bind(&record.findings)
        .bind(&record.actions_taken)
        .bind(record.cost)
        .bind(record.currency_id)
        .bind(&record.performed_by)
        .bind(record.vendor_id)
        .bind(record.assigned_to)
        .bind(&record.status)
        .bind(&record.approval_status)
        .bind(record.cost_threshold_exceeded)
        .bind(record.next_service_date)
        .bind(record.odometer_reading)
        .bind(record.created_by)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(
        &self,
        record: &MaintenanceRecord,
    ) -> Result<MaintenanceRecord, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>(
            r#"
            UPDATE maintenance_records SET
                maintenance_type_id = $2, scheduled_date = $3, actual_date = $4,
                description = $5, findings = $6, actions_taken = $7, cost = $8, currency_id = $9,
                performed_by = $10, vendor_id = $11, assigned_to = $12, status = $13,
                approval_status = $14, cost_threshold_exceeded = $15,
                next_service_date = $16, odometer_reading = $17, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(record.id)
        .bind(record.maintenance_type_id)
        .bind(record.scheduled_date)
        .bind(record.actual_date)
        .bind(&record.description)
        .bind(&record.findings)
        .bind(&record.actions_taken)
        .bind(record.cost)
        .bind(record.currency_id)
        .bind(&record.performed_by)
        .bind(record.vendor_id)
        .bind(record.assigned_to)
        .bind(&record.status)
        .bind(&record.approval_status)
        .bind(record.cost_threshold_exceeded)
        .bind(record.next_service_date)
        .bind(record.odometer_reading)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_records WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
