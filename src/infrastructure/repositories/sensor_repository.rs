//! Sensor Repository

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::SensorReading;

/// Sensor threshold model
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct SensorThreshold {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub sensor_type: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub warning_min: Option<f64>,
    pub warning_max: Option<f64>,
    pub alert_enabled: bool,
    pub alert_delay_seconds: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Sensor alert model
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct SensorAlert {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub sensor_id: String,
    pub threshold_id: Option<Uuid>,
    pub alert_type: String,
    pub severity: String,
    pub sensor_value: Option<f64>,
    pub threshold_value: Option<f64>,
    pub status: String,
    pub acknowledged_by: Option<Uuid>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub resolved_by: Option<Uuid>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolution_notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct SensorRepository {
    pool: PgPool,
}

impl SensorRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Readings
    pub async fn insert_reading(&self, reading: &SensorReading) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO sensor_readings (time, asset_id, sensor_id, temperature, humidity, 
                vibration_x, vibration_y, vibration_z, pressure, power_consumption, 
                custom_value, unit, status_code, quality)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            "#,
        )
        .bind(reading.time)
        .bind(reading.asset_id)
        .bind(&reading.sensor_id)
        .bind(reading.temperature)
        .bind(reading.humidity)
        .bind(reading.vibration_x)
        .bind(reading.vibration_y)
        .bind(reading.vibration_z)
        .bind(reading.pressure)
        .bind(reading.power_consumption)
        .bind(reading.custom_value)
        .bind(&reading.unit)
        .bind(reading.status_code)
        .bind(&reading.quality)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_latest_readings(
        &self,
        asset_id: Uuid,
        limit: i64,
    ) -> Result<Vec<SensorReading>, sqlx::Error> {
        sqlx::query_as::<_, SensorReading>(
            r#"
            SELECT * FROM sensor_readings
            WHERE asset_id = $1
            ORDER BY time DESC
            LIMIT $2
            "#,
        )
        .bind(asset_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_readings_in_range(
        &self,
        asset_id: Uuid,
        sensor_id: &str,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> Result<Vec<SensorReading>, sqlx::Error> {
        sqlx::query_as::<_, SensorReading>(
            r#"
            SELECT * FROM sensor_readings
            WHERE asset_id = $1 AND sensor_id = $2 AND time BETWEEN $3 AND $4
            ORDER BY time
            "#,
        )
        .bind(asset_id)
        .bind(sensor_id)
        .bind(start)
        .bind(end)
        .fetch_all(&self.pool)
        .await
    }

    // Thresholds
    pub async fn get_threshold(
        &self,
        asset_id: Uuid,
        sensor_type: &str,
    ) -> Result<Option<SensorThreshold>, sqlx::Error> {
        sqlx::query_as::<_, SensorThreshold>(
            "SELECT * FROM sensor_thresholds WHERE asset_id = $1 AND sensor_type = $2",
        )
        .bind(asset_id)
        .bind(sensor_type)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn set_threshold(
        &self,
        threshold: &SensorThreshold,
    ) -> Result<SensorThreshold, sqlx::Error> {
        sqlx::query_as::<_, SensorThreshold>(
            r#"
            INSERT INTO sensor_thresholds (id, asset_id, sensor_type, min_value, max_value, warning_min, warning_max, alert_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (asset_id, sensor_type) DO UPDATE SET
                min_value = $4, max_value = $5, warning_min = $6, warning_max = $7, alert_enabled = $8, updated_at = NOW()
            RETURNING *
            "#
        )
        .bind(threshold.id)
        .bind(threshold.asset_id)
        .bind(&threshold.sensor_type)
        .bind(threshold.min_value)
        .bind(threshold.max_value)
        .bind(threshold.warning_min)
        .bind(threshold.warning_max)
        .bind(threshold.alert_enabled)
        .fetch_one(&self.pool)
        .await
    }

    // Alerts
    pub async fn create_alert(&self, alert: &SensorAlert) -> Result<SensorAlert, sqlx::Error> {
        sqlx::query_as::<_, SensorAlert>(
            r#"
            INSERT INTO sensor_alerts (id, asset_id, sensor_id, threshold_id, alert_type, severity, sensor_value, threshold_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#
        )
        .bind(alert.id)
        .bind(alert.asset_id)
        .bind(&alert.sensor_id)
        .bind(alert.threshold_id)
        .bind(&alert.alert_type)
        .bind(&alert.severity)
        .bind(alert.sensor_value)
        .bind(alert.threshold_value)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn list_active_alerts(
        &self,
        asset_id: Option<Uuid>,
    ) -> Result<Vec<SensorAlert>, sqlx::Error> {
        if let Some(id) = asset_id {
            sqlx::query_as::<_, SensorAlert>(
                "SELECT * FROM sensor_alerts WHERE asset_id = $1 AND status = 'active' ORDER BY created_at DESC"
            )
            .bind(id)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, SensorAlert>(
                "SELECT * FROM sensor_alerts WHERE status = 'active' ORDER BY severity DESC, created_at DESC"
            )
            .fetch_all(&self.pool)
            .await
        }
    }

    pub async fn acknowledge_alert(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE sensor_alerts SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW() WHERE id = $1"
        )
        .bind(id)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn resolve_alert(
        &self,
        id: Uuid,
        user_id: Uuid,
        notes: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE sensor_alerts SET status = 'resolved', resolved_by = $2, resolved_at = NOW(), resolution_notes = $3 WHERE id = $1"
        )
        .bind(id)
        .bind(user_id)
        .bind(notes)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}
