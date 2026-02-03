//! Sensor Entity
//!
//! IoT sensor data for asset monitoring.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Sensor type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SensorType {
    Temperature,
    Humidity,
    Vibration,
    Pressure,
    PowerConsumption,
    OperatingHours,
    Custom,
}

impl SensorType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Temperature => "temperature",
            Self::Humidity => "humidity",
            Self::Vibration => "vibration",
            Self::Pressure => "pressure",
            Self::PowerConsumption => "power_consumption",
            Self::OperatingHours => "operating_hours",
            Self::Custom => "custom",
        }
    }
}

/// Sensor status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SensorStatus {
    Normal,
    Warning,
    Critical,
    Offline,
}

/// Sensor reading (timeseries data)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SensorReading {
    pub time: DateTime<Utc>,
    pub asset_id: Uuid,
    pub sensor_id: String,

    // Readings
    pub temperature: Option<f64>,
    pub humidity: Option<f64>,
    pub vibration_x: Option<f64>,
    pub vibration_y: Option<f64>,
    pub vibration_z: Option<f64>,
    pub pressure: Option<f64>,
    pub power_consumption: Option<f64>,
    pub custom_value: Option<f64>,

    // Metadata
    pub unit: Option<String>,
    pub status_code: Option<i32>,
    pub quality: Option<String>,
}

impl SensorReading {
    pub fn new(asset_id: Uuid, sensor_id: String) -> Self {
        Self {
            time: Utc::now(),
            asset_id,
            sensor_id,
            temperature: None,
            humidity: None,
            vibration_x: None,
            vibration_y: None,
            vibration_z: None,
            pressure: None,
            power_consumption: None,
            custom_value: None,
            unit: None,
            status_code: None,
            quality: None,
        }
    }
}

/// Sensor threshold for alerts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensorThreshold {
    pub asset_id: Uuid,
    pub sensor_type: SensorType,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub warning_min: Option<f64>,
    pub warning_max: Option<f64>,
}

impl SensorThreshold {
    /// Check if value exceeds threshold
    pub fn check_value(&self, value: f64) -> SensorStatus {
        if let (Some(min), Some(max)) = (self.min_value, self.max_value) {
            if value < min || value > max {
                return SensorStatus::Critical;
            }
        }

        if let (Some(warn_min), Some(warn_max)) = (self.warning_min, self.warning_max) {
            if value < warn_min || value > warn_max {
                return SensorStatus::Warning;
            }
        }

        SensorStatus::Normal
    }
}

/// Aggregated sensor data for dashboard
#[derive(Debug, Clone, Serialize)]
pub struct SensorSummary {
    pub asset_id: Uuid,
    pub sensor_id: String,
    pub sensor_type: String,
    pub last_reading: f64,
    pub last_reading_time: DateTime<Utc>,
    pub avg_24h: Option<f64>,
    pub min_24h: Option<f64>,
    pub max_24h: Option<f64>,
    pub status: SensorStatus,
}
