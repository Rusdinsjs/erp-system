//! Rental Entity
//!
//! Core entity for Rented-Out (external asset rental) operations.
//! Supports Multi-Asset Rentals (1 Rental Agreement -> Many Rental Items).

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

/// Main Rental entity (Rental Agreement Header)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Rental {
    pub id: Uuid,
    pub rental_number: String,
    pub client_id: Uuid,

    // Header Status (Aggregate)
    pub status: String,

    // Master Dates (Contractual)
    pub request_date: NaiveDate,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,

    // Financial Totals (Aggregate)
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

    // Documents
    pub agreement_document: Option<String>,
    pub invoice_number: Option<String>,

    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    // Joined Items
    #[sqlx(default)]
    pub items: Option<Vec<RentalItem>>,

    // Joined Client Name (for display)
    #[sqlx(default)]
    pub client_name: Option<String>,
}

/// Rental Item (Asset Line Item)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalItem {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub asset_id: Uuid,
    pub rental_rate_id: Option<Uuid>,

    // Snapshot
    pub rate_amount: Option<Decimal>,
    pub rate_basis: Option<String>,

    pub status: String,

    // Dates
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,

    // Dispatch/Return
    pub dispatched_by: Option<Uuid>,
    pub dispatched_at: Option<DateTime<Utc>>,
    pub returned_by: Option<Uuid>,
    pub returned_at: Option<DateTime<Utc>>,

    // Financials
    pub subtotal: Option<Decimal>,
    pub penalty_amount: Option<Decimal>,
    pub mob_demob_cost: Option<Decimal>,
    pub is_fuel_included: Option<bool>,

    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    // Joined Display Fields
    #[sqlx(default)]
    pub asset_name: Option<String>,
    #[sqlx(default)]
    pub asset_code: Option<String>,
}

impl Rental {
    /// Create a new rental request header
    pub fn new(client_id: Uuid, requested_by: Uuid) -> Self {
        let now = Utc::now();
        let rental_number = format!("RNT-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            rental_number,
            client_id,
            status: RentalStatus::Requested.as_str().to_string(),
            request_date: now.date_naive(),
            start_date: None,
            expected_end_date: None,
            actual_end_date: None,
            subtotal: Some(Decimal::ZERO),
            deposit_amount: Some(Decimal::ZERO),
            deposit_returned: Some(false),
            penalty_amount: Some(Decimal::ZERO),
            total_amount: Some(Decimal::ZERO),
            requested_by: Some(requested_by),
            approved_by: None,
            approved_at: None,
            rejection_reason: None,
            agreement_document: None,
            invoice_number: None,
            notes: None,
            created_at: Some(now),
            updated_at: Some(now),
            items: Some(vec![]),
            client_name: None,
        }
    }

    /// Get current status as enum
    pub fn get_status(&self) -> Option<RentalStatus> {
        RentalStatus::from_str(&self.status)
    }

    /// Check if rental is overdue (Header level check - based on contract dates)
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

    /// Can be dispatched (Check if ANY item can be dispatched? Or Header status?)
    /// For Header, "Approved" means "Ready to Dispatch".
    pub fn can_dispatch(&self) -> bool {
        self.get_status() == Some(RentalStatus::Approved)
            || self.get_status() == Some(RentalStatus::RentedOut)
    }

    /// Can be returned
    pub fn can_return(&self) -> bool {
        matches!(
            self.get_status(),
            Some(RentalStatus::RentedOut) | Some(RentalStatus::Overdue)
        )
    }
}

/// Rental Rate Template
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalRate {
    pub id: Uuid,
    pub name: Option<String>,
    pub category_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,
    pub rate_type: Option<String>, // 'hourly', 'daily', etc.
    pub rate_amount: Decimal,
    pub currency: Option<String>,

    // Contract rules
    pub minimum_duration: Option<i32>,
    pub deposit_percentage: Option<Decimal>,
    pub ma_threshold: Option<Decimal>,
    pub availability_penalty_multiplier: Option<Decimal>,
    pub standby_multiplier: Option<Decimal>,
    pub breakdown_penalty_per_day: Option<Decimal>,
    pub hours_per_day: Option<Decimal>, // e.g. 8
    pub days_per_month: Option<i32>,    // e.g. 25, 30

    // Additional fields from DB
    pub rate_basis: Option<String>,
    pub minimum_hours: Option<Decimal>,
    pub overtime_multiplier: Option<Decimal>,
    pub late_fee_per_day: Option<Decimal>,
    pub fuel_surcharge_rate: Option<Decimal>,
    pub tier_config: Option<serde_json::Value>,
    pub is_active: Option<bool>,

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl RentalRate {
    pub fn to_hourly_rate(&self) -> Decimal {
        match self.rate_basis.as_deref().unwrap_or("hourly") {
            "hourly" => self.rate_amount,
            "daily" => {
                let hours = self.hours_per_day.unwrap_or(Decimal::from(8));
                if hours.is_zero() {
                    Decimal::ZERO
                } else {
                    self.rate_amount / hours
                }
            }
            "monthly" => {
                let days = self.days_per_month.unwrap_or(25);
                let hours = self.hours_per_day.unwrap_or(Decimal::from(8));
                let total_hours = Decimal::from(days) * hours;
                if total_hours.is_zero() {
                    Decimal::ZERO
                } else {
                    self.rate_amount / total_hours
                }
            }
            _ => self.rate_amount,
        }
    }
}

/// Rental Handover Record (Dispatch/Return)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalHandover {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub rental_item_id: Option<Uuid>, // Added via migration
    pub handover_type: String,        // 'dispatch' or 'return'
    pub handover_date: DateTime<Utc>,
    pub conducted_by: Uuid,
    pub notes: Option<String>,
    pub photos: Option<Vec<String>>,
    pub condition_checklist: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
}
