//! Rental Timesheet Entity
//!
//! Daily operation logs for rental assets.

use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Operation status for timesheet entries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationStatus {
    Operating,
    Standby,
    Breakdown,
    Off,
    Maintenance,
}

impl OperationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Operating => "operating",
            Self::Standby => "standby",
            Self::Breakdown => "breakdown",
            Self::Off => "off",
            Self::Maintenance => "maintenance",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "operating" => Some(Self::Operating),
            "standby" => Some(Self::Standby),
            "breakdown" => Some(Self::Breakdown),
            "off" => Some(Self::Off),
            "maintenance" => Some(Self::Maintenance),
            _ => None,
        }
    }
}

/// Timesheet verification status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimesheetStatus {
    Draft,
    Submitted,
    Verified,
    Approved,
    Disputed,
    Revised,
}

impl TimesheetStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
            Self::Verified => "verified",
            Self::Approved => "approved",
            Self::Disputed => "disputed",
            Self::Revised => "revised",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "submitted" => Some(Self::Submitted),
            "verified" => Some(Self::Verified),
            "approved" => Some(Self::Approved),
            "disputed" => Some(Self::Disputed),
            "revised" => Some(Self::Revised),
            _ => None,
        }
    }
}

/// Daily timesheet entry
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalTimesheet {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub work_date: NaiveDate,

    // Operating hours
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub operating_hours: Option<Decimal>,
    pub standby_hours: Option<Decimal>,
    pub overtime_hours: Option<Decimal>,
    pub breakdown_hours: Option<Decimal>,

    // Hour Meter / Kilometer
    pub hm_km_start: Option<Decimal>,
    pub hm_km_end: Option<Decimal>,
    pub hm_km_usage: Option<Decimal>,

    // Operation details
    pub operation_status: String,
    pub breakdown_reason: Option<String>,
    pub work_description: Option<String>,
    pub work_location: Option<String>,

    // Documentation
    pub photos: Option<serde_json::Value>,

    // Checker (field recorder)
    pub checker_id: Option<Uuid>,
    pub checker_at: Option<DateTime<Utc>>,
    pub checker_notes: Option<String>,

    // Verifier (supervisor)
    pub verifier_id: Option<Uuid>,
    pub verifier_at: Option<DateTime<Utc>>,
    pub verifier_status: Option<String>,
    pub verifier_notes: Option<String>,

    // Client PIC
    pub client_pic_id: Option<Uuid>,
    pub client_approved_at: Option<DateTime<Utc>>,
    pub client_signature: Option<String>,
    pub client_notes: Option<String>,

    // Status
    pub status: Option<String>,

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl RentalTimesheet {
    /// Create new timesheet entry
    pub fn new(rental_id: Uuid, work_date: NaiveDate, checker_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            rental_id,
            work_date,
            start_time: None,
            end_time: None,
            operating_hours: Some(Decimal::ZERO),
            standby_hours: Some(Decimal::ZERO),
            overtime_hours: Some(Decimal::ZERO),
            breakdown_hours: Some(Decimal::ZERO),
            hm_km_start: None,
            hm_km_end: None,
            hm_km_usage: None,
            operation_status: OperationStatus::Operating.as_str().to_string(),
            breakdown_reason: None,
            work_description: None,
            work_location: None,
            photos: Some(serde_json::json!([])),
            checker_id: Some(checker_id),
            checker_at: Some(now),
            checker_notes: None,
            verifier_id: None,
            verifier_at: None,
            verifier_status: Some("pending".to_string()),
            verifier_notes: None,
            client_pic_id: None,
            client_approved_at: None,
            client_signature: None,
            client_notes: None,
            status: Some(TimesheetStatus::Draft.as_str().to_string()),
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    /// Calculate overtime based on standard hours (8 hours)
    pub fn calculate_overtime(&mut self, standard_hours: Decimal) {
        if let Some(operating) = self.operating_hours {
            if operating > standard_hours {
                self.overtime_hours = Some(operating - standard_hours);
            } else {
                self.overtime_hours = Some(Decimal::ZERO);
            }
        }
    }

    /// Calculate HM/KM usage
    pub fn calculate_usage(&mut self) {
        if let (Some(start), Some(end)) = (self.hm_km_start, self.hm_km_end) {
            self.hm_km_usage = Some(end - start);
        }
    }

    /// Check if approved by all parties
    pub fn is_fully_approved(&self) -> bool {
        self.verifier_status.as_deref() == Some("approved") && self.client_approved_at.is_some()
    }
}

/// Client contact (PIC)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ClientContact {
    pub id: Uuid,
    pub client_id: Uuid,
    pub name: String,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub can_approve_timesheet: Option<bool>,
    pub can_approve_billing: Option<bool>,
    pub approval_limit: Option<Decimal>,
    pub is_primary: Option<bool>,
    pub is_active: Option<bool>,
    pub signature_specimen: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl ClientContact {
    pub fn new(client_id: Uuid, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            client_id,
            name,
            position: None,
            email: None,
            phone: None,
            can_approve_timesheet: Some(false),
            can_approve_billing: Some(false),
            approval_limit: None,
            is_primary: Some(false),
            is_active: Some(true),
            signature_specimen: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }
}
