//! Rental Entity
//!
//! Core entity for Rented-Out (external asset rental) operations.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Rental status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RentalStatus {
    Requested,
    Approved,
    Rejected,
    RentedOut,
    Returned,
    Overdue,
    Cancelled,
}

impl RentalStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Requested => "requested",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::RentedOut => "rented_out",
            Self::Returned => "returned",
            Self::Overdue => "overdue",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "requested" => Some(Self::Requested),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "rented_out" => Some(Self::RentedOut),
            "returned" => Some(Self::Returned),
            "overdue" => Some(Self::Overdue),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Requested => "Requested",
            Self::Approved => "Approved",
            Self::Rejected => "Rejected",
            Self::RentedOut => "Rented Out",
            Self::Returned => "Returned",
            Self::Overdue => "Overdue",
            Self::Cancelled => "Cancelled",
        }
    }

    pub fn color(&self) -> &'static str {
        match self {
            Self::Requested => "blue",
            Self::Approved => "green",
            Self::Rejected => "red",
            Self::RentedOut => "orange",
            Self::Returned => "gray",
            Self::Overdue => "red",
            Self::Cancelled => "gray",
        }
    }
}

/// Main Rental entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Rental {
    pub id: Uuid,
    pub rental_number: String,
    pub asset_id: Uuid,
    pub client_id: Uuid,
    pub rental_rate_id: Option<Uuid>,

    // Status
    pub status: String,

    // Dates
    pub request_date: NaiveDate,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,

    // Financial
    pub daily_rate: Option<Decimal>,
    pub total_days: Option<i32>,
    pub subtotal: Option<Decimal>,
    pub deposit_amount: Option<Decimal>,
    pub deposit_returned: Option<bool>,
    pub penalty_amount: Option<Decimal>,
    pub total_amount: Option<Decimal>,

    // Approval
    pub requested_by: Option<Uuid>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,

    // Dispatch
    pub dispatched_by: Option<Uuid>,
    pub dispatched_at: Option<DateTime<Utc>>,

    // Return
    pub returned_by: Option<Uuid>,
    pub returned_at: Option<DateTime<Utc>>,

    // Documents
    pub agreement_document: Option<String>,
    pub delivery_note: Option<String>,
    pub invoice_number: Option<String>,

    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl Rental {
    /// Create a new rental request
    pub fn new(asset_id: Uuid, client_id: Uuid, requested_by: Uuid) -> Self {
        let now = Utc::now();
        let rental_number = format!("RNT-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            rental_number,
            asset_id,
            client_id,
            rental_rate_id: None,
            status: RentalStatus::Requested.as_str().to_string(),
            request_date: now.date_naive(),
            start_date: None,
            expected_end_date: None,
            actual_end_date: None,
            daily_rate: None,
            total_days: None,
            subtotal: None,
            deposit_amount: Some(Decimal::ZERO),
            deposit_returned: Some(false),
            penalty_amount: Some(Decimal::ZERO),
            total_amount: None,
            requested_by: Some(requested_by),
            approved_by: None,
            approved_at: None,
            rejection_reason: None,
            dispatched_by: None,
            dispatched_at: None,
            returned_by: None,
            returned_at: None,
            agreement_document: None,
            delivery_note: None,
            invoice_number: None,
            notes: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    /// Get current status as enum
    pub fn get_status(&self) -> Option<RentalStatus> {
        RentalStatus::from_str(&self.status)
    }

    /// Check if rental is overdue
    pub fn is_overdue(&self) -> bool {
        if let Some(expected_end) = self.expected_end_date {
            let today = Utc::now().date_naive();
            self.actual_end_date.is_none()
                && expected_end < today
                && self.get_status() == Some(RentalStatus::RentedOut)
        } else {
            false
        }
    }

    /// Calculate days overdue
    pub fn days_overdue(&self) -> i64 {
        if !self.is_overdue() {
            return 0;
        }
        if let Some(expected_end) = self.expected_end_date {
            let today = Utc::now().date_naive();
            (today - expected_end).num_days()
        } else {
            0
        }
    }

    /// Can be approved
    pub fn can_approve(&self) -> bool {
        self.get_status() == Some(RentalStatus::Requested)
    }

    /// Can be dispatched
    pub fn can_dispatch(&self) -> bool {
        self.get_status() == Some(RentalStatus::Approved)
    }

    /// Can be returned
    pub fn can_return(&self) -> bool {
        matches!(
            self.get_status(),
            Some(RentalStatus::RentedOut) | Some(RentalStatus::Overdue)
        )
    }

    /// Calculate total based on days and rate
    pub fn calculate_total(&mut self) {
        if let (Some(rate), Some(days)) = (self.daily_rate, self.total_days) {
            let subtotal = rate * Decimal::from(days);
            self.subtotal = Some(subtotal);

            let penalty = self.penalty_amount.unwrap_or(Decimal::ZERO);
            self.total_amount = Some(subtotal + penalty);
        }
    }
}

/// Rental rate configuration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalRate {
    pub id: Uuid,
    pub name: String,
    pub category_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,
    pub rate_type: String, // 'daily', 'weekly', 'monthly'
    pub rate_amount: Decimal,
    pub currency: Option<String>,
    pub minimum_duration: Option<i32>,
    pub deposit_percentage: Option<Decimal>,
    pub late_fee_per_day: Option<Decimal>,
    pub is_active: Option<bool>,

    // Enhanced billing configuration
    #[sqlx(default)]
    pub rate_basis: Option<String>, // 'hourly', 'daily', 'monthly'
    #[sqlx(default)]
    pub minimum_hours: Option<Decimal>, // Default 200 jam per bulan
    #[sqlx(default)]
    pub overtime_multiplier: Option<Decimal>, // Default 1.25 (125%)
    #[sqlx(default)]
    pub standby_multiplier: Option<Decimal>, // Default 0.50 (50%)
    #[sqlx(default)]
    pub breakdown_penalty_per_day: Option<Decimal>, // Custom penalty
    #[sqlx(default)]
    pub hours_per_day: Option<Decimal>, // Default 8 jam
    #[sqlx(default)]
    pub days_per_month: Option<i32>, // Default 25 hari

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl RentalRate {
    pub fn new(name: String, rate_type: String, rate_amount: Decimal) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            category_id: None,
            asset_id: None,
            rate_type,
            rate_amount,
            currency: Some("IDR".to_string()),
            minimum_duration: Some(1),
            deposit_percentage: None,
            late_fee_per_day: None,
            is_active: Some(true),
            // Enhanced billing defaults
            rate_basis: Some("hourly".to_string()),
            minimum_hours: Some(Decimal::from(200)),
            overtime_multiplier: Some(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE)),
            standby_multiplier: Some(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE)),
            breakdown_penalty_per_day: Some(Decimal::ZERO),
            hours_per_day: Some(Decimal::from(8)),
            days_per_month: Some(25),
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    /// Convert rate to daily equivalent
    pub fn to_daily_rate(&self) -> Decimal {
        match self.rate_type.as_str() {
            "daily" => self.rate_amount,
            "weekly" => self.rate_amount / Decimal::from(7),
            "monthly" => self.rate_amount / Decimal::from(30),
            _ => self.rate_amount,
        }
    }

    /// Convert rate to hourly equivalent
    pub fn to_hourly_rate(&self) -> Decimal {
        let hours_per_day = self.hours_per_day.unwrap_or(Decimal::from(8));
        match self.rate_basis.as_deref().unwrap_or("hourly") {
            "hourly" => self.rate_amount,
            "daily" => self.rate_amount / hours_per_day,
            "monthly" => {
                let days = Decimal::from(self.days_per_month.unwrap_or(25));
                self.rate_amount / (days * hours_per_day)
            }
            _ => self.rate_amount,
        }
    }
}

/// Rental handover (condition documentation)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalHandover {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub handover_type: String,
    pub condition_rating: Option<String>,
    pub condition_notes: Option<String>,
    pub photos: Option<serde_json::Value>,
    pub has_damage: Option<bool>,
    pub damage_description: Option<String>,
    pub damage_photos: Option<serde_json::Value>,
    pub recorded_by: Option<Uuid>,
    pub recorded_at: Option<DateTime<Utc>>,
    pub signature_data: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

impl RentalHandover {
    /// Create dispatch handover
    pub fn new_dispatch(rental_id: Uuid, recorded_by: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            rental_id,
            handover_type: "dispatch".to_string(),
            condition_rating: None,
            condition_notes: None,
            photos: Some(serde_json::json!([])),
            has_damage: Some(false),
            damage_description: None,
            damage_photos: Some(serde_json::json!([])),
            recorded_by: Some(recorded_by),
            recorded_at: Some(now),
            signature_data: None,
            created_at: Some(now),
        }
    }

    /// Create return handover
    pub fn new_return(rental_id: Uuid, recorded_by: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            rental_id,
            handover_type: "return".to_string(),
            condition_rating: None,
            condition_notes: None,
            photos: Some(serde_json::json!([])),
            has_damage: Some(false),
            damage_description: None,
            damage_photos: Some(serde_json::json!([])),
            recorded_by: Some(recorded_by),
            recorded_at: Some(now),
            signature_data: None,
            created_at: Some(now),
        }
    }
}
