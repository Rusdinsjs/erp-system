//! Fuel Log Entity
//!
//! Tracks fuel requests, approvals (coupons), and realizations.

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Fuel Request Type (Volume or Amount)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FuelRequestType {
    Volume, // Liters
    Amount, // Rupiah
}

impl FuelRequestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Volume => "volume",
            Self::Amount => "amount",
        }
    }
}

/// Fuel Request Status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FuelStatus {
    Requested,
    Approved,
    Rejected,
    Completed,
}

impl FuelStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Requested => "requested",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Completed => "completed",
        }
    }
}

/// Fuel Log Entry
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FuelLog {
    pub id: Uuid,
    pub tracking_number: String,
    pub asset_id: Uuid,

    pub requested_by: Uuid,
    pub driver_id: Option<Uuid>,

    pub odometer_reading: Decimal,
    pub odometer_image_url: String,
    pub request_type: String,
    pub requested_value: Decimal,

    pub status: String,
    pub coupon_code: Option<String>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,

    pub actual_filled_amount: Option<Decimal>,
    pub actual_volume: Option<Decimal>,
    pub receipt_image_url: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joined fields
    #[sqlx(default)]
    pub asset_name: Option<String>,
    #[sqlx(default)]
    pub requester_name: Option<String>,
}

impl FuelLog {
    pub fn new(
        asset_id: Uuid,
        requested_by: Uuid,
        odometer_reading: Decimal,
        odometer_image_url: String,
        request_type: &FuelRequestType,
        requested_value: Decimal,
    ) -> Self {
        let now = Utc::now();
        // Tracking number logic should be in service or here if unique enough
        // Using timestamp for simple uniqueness in entity constructor, but reliable gen should be in repo/service
        let tracking_number = format!("FL-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            tracking_number,
            asset_id,
            requested_by,
            driver_id: None, // Can be set later
            odometer_reading,
            odometer_image_url,
            request_type: request_type.as_str().to_string(),
            requested_value,
            status: FuelStatus::Requested.as_str().to_string(),
            coupon_code: None,
            approved_by: None,
            approved_at: None,
            rejection_reason: None,
            actual_filled_amount: None,
            actual_volume: None,
            receipt_image_url: None,
            completed_at: None,
            created_at: now,
            updated_at: now,
            asset_name: None,
            requester_name: None,
        }
    }
}
