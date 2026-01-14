//! Sensor Service

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::entities::SensorReading;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{SensorAlert, SensorRepository, SensorThreshold};

#[derive(Clone)]
pub struct SensorService {
    repository: SensorRepository,
}

impl SensorService {
    pub fn new(repository: SensorRepository) -> Self {
        Self { repository }
    }

    /// Record sensor reading
    pub async fn record_reading(&self, reading: SensorReading) -> DomainResult<()> {
        // Check thresholds and create alerts if needed
        self.check_thresholds_and_alert(&reading).await?;

        self.repository.insert_reading(&reading).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// Get latest readings for an asset
    pub async fn get_latest_readings(
        &self,
        asset_id: Uuid,
        limit: i64,
    ) -> DomainResult<Vec<SensorReading>> {
        self.repository
            .get_latest_readings(asset_id, limit)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get readings in date range
    pub async fn get_readings_in_range(
        &self,
        asset_id: Uuid,
        sensor_id: &str,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> DomainResult<Vec<SensorReading>> {
        self.repository
            .get_readings_in_range(asset_id, sensor_id, start, end)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Set threshold for sensor
    pub async fn set_threshold(
        &self,
        asset_id: Uuid,
        sensor_type: &str,
        min: Option<f64>,
        max: Option<f64>,
        warning_min: Option<f64>,
        warning_max: Option<f64>,
    ) -> DomainResult<SensorThreshold> {
        let threshold = SensorThreshold {
            id: Uuid::new_v4(),
            asset_id,
            sensor_type: sensor_type.to_string(),
            min_value: min,
            max_value: max,
            warning_min,
            warning_max,
            alert_enabled: true,
            alert_delay_seconds: Some(60),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repository
            .set_threshold(&threshold)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get threshold
    pub async fn get_threshold(
        &self,
        asset_id: Uuid,
        sensor_type: &str,
    ) -> DomainResult<Option<SensorThreshold>> {
        self.repository
            .get_threshold(asset_id, sensor_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List active alerts
    pub async fn list_active_alerts(
        &self,
        asset_id: Option<Uuid>,
    ) -> DomainResult<Vec<SensorAlert>> {
        self.repository
            .list_active_alerts(asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Acknowledge alert
    pub async fn acknowledge_alert(&self, id: Uuid, user_id: Uuid) -> DomainResult<bool> {
        self.repository
            .acknowledge_alert(id, user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Resolve alert
    pub async fn resolve_alert(&self, id: Uuid, user_id: Uuid, notes: &str) -> DomainResult<bool> {
        self.repository
            .resolve_alert(id, user_id, notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Check thresholds and create alert if exceeded
    async fn check_thresholds_and_alert(&self, reading: &SensorReading) -> DomainResult<()> {
        // Check temperature threshold
        if let Some(temp) = reading.temperature {
            if let Ok(Some(threshold)) = self
                .repository
                .get_threshold(reading.asset_id, "temperature")
                .await
            {
                if threshold.alert_enabled {
                    let (severity, exceeded) = self.check_value_against_threshold(temp, &threshold);
                    if exceeded {
                        self.create_threshold_alert(
                            reading.asset_id,
                            &reading.sensor_id,
                            Some(threshold.id),
                            temp,
                            severity,
                        )
                        .await?;
                    }
                }
            }
        }

        // Similar checks for other sensor types can be added

        Ok(())
    }

    fn check_value_against_threshold(
        &self,
        value: f64,
        threshold: &SensorThreshold,
    ) -> (&'static str, bool) {
        // Check critical thresholds
        if let (Some(min), Some(max)) = (threshold.min_value, threshold.max_value) {
            if value < min || value > max {
                return ("critical", true);
            }
        }

        // Check warning thresholds
        if let (Some(warn_min), Some(warn_max)) = (threshold.warning_min, threshold.warning_max) {
            if value < warn_min || value > warn_max {
                return ("warning", true);
            }
        }

        ("normal", false)
    }

    async fn create_threshold_alert(
        &self,
        asset_id: Uuid,
        sensor_id: &str,
        threshold_id: Option<Uuid>,
        value: f64,
        severity: &str,
    ) -> DomainResult<SensorAlert> {
        let alert = SensorAlert {
            id: Uuid::new_v4(),
            asset_id,
            sensor_id: sensor_id.to_string(),
            threshold_id,
            alert_type: "threshold_exceeded".to_string(),
            severity: severity.to_string(),
            sensor_value: Some(value),
            threshold_value: None,
            status: "active".to_string(),
            acknowledged_by: None,
            acknowledged_at: None,
            resolved_by: None,
            resolved_at: None,
            resolution_notes: None,
            created_at: Utc::now(),
        };

        self.repository
            .create_alert(&alert)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
