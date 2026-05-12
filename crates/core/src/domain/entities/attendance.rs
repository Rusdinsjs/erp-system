//! Attendance Entity
//!
//! Attendance record for employee check-in/check-out tracking.
//!

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::str::FromStr;
use uuid::Uuid;

/// Check-in/out status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttendanceStatus {
    OnTime,
    Late,
    Early,
}

impl FromStr for AttendanceStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "on_time" | "ontime" => Ok(Self::OnTime),
            "late" => Ok(Self::Late),
            "early" => Ok(Self::Early),
            _ => Err(format!("Invalid attendance status: {}", s)),
        }
    }
}

impl AttendanceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::OnTime => "on_time",
            Self::Late => "late",
            Self::Early => "early",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as FromStr>::from_str(s).ok()
    }
}

/// Attendance record entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub employee_id: Uuid,

    // Check-in/out times
    pub check_in_time: Option<DateTime<Utc>>,
    pub check_out_time: Option<DateTime<Utc>>,

    // Location data
    pub check_in_location_id: Option<Uuid>,
    pub check_out_location_id: Option<Uuid>,
    pub check_in_lat: Option<f64>,
    pub check_in_long: Option<f64>,
    pub check_out_lat: Option<f64>,
    pub check_out_long: Option<f64>,

    // Status
    pub check_in_status: Option<String>,
    pub check_out_status: Option<String>,
    pub is_mock_location: bool,

    // Device & Notes
    pub device_info: Option<String>,
    pub notes: Option<String>,

    // Photos
    pub check_in_photo_url: Option<String>,
    pub check_out_photo_url: Option<String>,

    pub created_at: DateTime<Utc>,

    // Joined fields (optional)
    #[sqlx(default)]
    pub employee_name: Option<String>,
    #[sqlx(default)]
    pub employee_nik: Option<String>,
}

/// Request for check-in
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckInRequest {
    pub latitude: f64,
    pub longitude: f64,
    pub device_info: Option<String>,
    pub photo_url: Option<String>,
}

/// Request for check-out
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckOutRequest {
    pub latitude: f64,
    pub longitude: f64,
    pub device_info: Option<String>,
    pub notes: Option<String>,
    pub photo_url: Option<String>,
}

/// Today's attendance status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayAttendanceStatus {
    pub has_checked_in: bool,
    pub has_checked_out: bool,
    pub check_in_time: Option<DateTime<Utc>>,
    pub check_out_time: Option<DateTime<Utc>>,
    pub check_in_status: Option<String>,
    pub check_out_status: Option<String>,
    pub record: Option<AttendanceRecord>,
}
