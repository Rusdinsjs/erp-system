//! Rental DTOs
//!
//! Data Transfer Objects for rental operations.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Request to create a new rental (Header + Items)
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRentalRequest {
    pub client_id: Uuid,
    pub request_date: Option<NaiveDate>,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub deposit_amount: Option<Decimal>,
    pub notes: Option<String>,

    // Items
    pub items: Vec<CreateRentalItemRequest>,
}

/// Request to create a rental item line
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRentalItemRequest {
    pub asset_id: Uuid,
    pub rental_rate_id: Option<Uuid>,
    pub rate_amount: Option<Decimal>,
    pub rate_basis: Option<String>,
    pub notes: Option<String>,
}

/// Request to approve a rental
#[derive(Debug, Clone, Deserialize)]
pub struct ApproveRentalRequest {
    pub start_date: NaiveDate,
    pub expected_end_date: NaiveDate,
    pub deposit_amount: Option<Decimal>,
    // Rates are approved as proposed in items
}

/// Request to reject a rental
#[derive(Debug, Clone, Deserialize)]
pub struct RejectRentalRequest {
    pub reason: String,
}

/// Request for dispatch (handover out)
#[derive(Debug, Clone, Deserialize)]
pub struct DispatchRentalRequest {
    pub rental_item_id: Uuid, // Specific item to dispatch
    pub condition_rating: String,
    pub condition_notes: Option<String>,
    pub photos: Option<Vec<String>>,
    pub location_id: Option<Uuid>,
}

/// Request for return (handover in)
#[derive(Debug, Clone, Deserialize)]
pub struct ReturnRentalRequest {
    pub rental_item_id: Uuid, // Specific item to return
    pub return_date: NaiveDate,
    pub meter_reading: Decimal,
    pub condition_rating: String,
    pub condition_notes: Option<String>,
    pub has_damage: bool,
    pub damage_description: Option<String>,
    pub photos: Option<Vec<String>>,
    pub damage_photos: Option<Vec<String>>,
    pub location_id: Option<Uuid>,
}

/// Request to create a client
#[derive(Debug, Clone, Deserialize)]
pub struct CreateClientRequest {
    pub name: String,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub contact_person: Option<String>,
    pub tax_id: Option<String>,
    pub notes: Option<String>,
}

/// Request to update a client
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateClientRequest {
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub contact_person: Option<String>,
    pub tax_id: Option<String>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
}

/// Request to create a rental rate
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRentalRateRequest {
    pub name: String,
    pub category_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,
    pub rate_type: String,
    pub rate_amount: Decimal,
    pub currency: Option<String>,
    pub minimum_duration: Option<i32>,
    pub deposit_percentage: Option<Decimal>,
    pub late_fee_per_day: Option<Decimal>,
    pub ma_threshold: Option<Decimal>,
    pub availability_penalty_multiplier: Option<Decimal>,

    // Enhanced billing fields
    pub rate_basis: Option<String>,
    pub minimum_hours: Option<Decimal>,
    pub overtime_multiplier: Option<Decimal>,
    pub standby_multiplier: Option<Decimal>,
    pub breakdown_penalty_per_day: Option<Decimal>,
    pub hours_per_day: Option<Decimal>,
    pub days_per_month: Option<i32>,
}

/// Request to update a rental rate
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRentalRateRequest {
    pub name: Option<String>,
    pub category_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,
    pub rate_type: Option<String>,
    pub rate_amount: Option<Decimal>,
    pub currency: Option<String>,
    pub minimum_duration: Option<i32>,
    pub deposit_percentage: Option<Decimal>,
    pub late_fee_per_day: Option<Decimal>,
    pub ma_threshold: Option<Decimal>,
    pub availability_penalty_multiplier: Option<Decimal>,
    pub is_active: Option<bool>,

    // Enhanced billing fields
    pub rate_basis: Option<String>,
    pub minimum_hours: Option<Decimal>,
    pub overtime_multiplier: Option<Decimal>,
    pub standby_multiplier: Option<Decimal>,
    pub breakdown_penalty_per_day: Option<Decimal>,
    pub hours_per_day: Option<Decimal>,
    pub days_per_month: Option<i32>,
}

/// Rental response with enriched data
#[derive(Debug, Clone, Serialize)]
pub struct RentalResponse {
    pub id: Uuid,
    pub rental_number: String,
    pub asset_id: Uuid,
    pub asset_name: Option<String>,
    pub client_id: Uuid,
    pub client_name: Option<String>,
    pub status: String,
    pub request_date: NaiveDate,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub daily_rate: Option<Decimal>,
    pub total_days: Option<i32>,
    pub subtotal: Option<Decimal>,
    pub deposit_amount: Option<Decimal>,
    pub penalty_amount: Option<Decimal>,
    pub total_amount: Option<Decimal>,
    pub notes: Option<String>,
    pub is_overdue: bool,
}

/// Rental list query parameters
#[derive(Debug, Clone, Deserialize)]
pub struct RentalListParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub status: Option<String>,
    pub client_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,
}

impl RentalListParams {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1)
    }

    pub fn per_page(&self) -> i64 {
        self.per_page.unwrap_or(10)
    }
}

/// Request to preview billing calculation
#[derive(Debug, Clone, Deserialize)]
pub struct BillingPreviewRequest {
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Request to create a billing record
#[derive(Debug, Clone, Deserialize)]
pub struct BillingCreateRequest {
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Rental Schedule Item (for Gantt)
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct RentalScheduleItem {
    pub rental_id: Uuid,
    pub rental_item_id: Uuid,
    pub rental_number: String,
    pub client_name: String,
    pub asset_id: Uuid,
    pub asset_name: String,
    pub asset_code: String,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub status: String, // rental_item status
}
