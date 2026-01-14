//! Rental DTOs
//!
//! Data Transfer Objects for rental operations.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Request to create a new rental
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRentalRequest {
    pub asset_id: Uuid,
    pub client_id: Uuid,
    pub start_date: Option<NaiveDate>,
    pub expected_end_date: Option<NaiveDate>,
    pub daily_rate: Option<Decimal>,
    pub deposit_amount: Option<Decimal>,
    pub notes: Option<String>,
}

/// Request to approve a rental
#[derive(Debug, Clone, Deserialize)]
pub struct ApproveRentalRequest {
    pub start_date: NaiveDate,
    pub expected_end_date: NaiveDate,
    pub daily_rate: Decimal,
    pub deposit_amount: Option<Decimal>,
}

/// Request to reject a rental
#[derive(Debug, Clone, Deserialize)]
pub struct RejectRentalRequest {
    pub reason: String,
}

/// Request for dispatch (handover out)
#[derive(Debug, Clone, Deserialize)]
pub struct DispatchRentalRequest {
    pub condition_rating: String,
    pub condition_notes: Option<String>,
    pub photos: Option<Vec<String>>,
    pub location_id: Option<Uuid>,
}

/// Request for return (handover in)
#[derive(Debug, Clone, Deserialize)]
pub struct ReturnRentalRequest {
    pub condition_rating: String,
    pub condition_notes: Option<String>,
    pub photos: Option<Vec<String>>,
    pub has_damage: bool,
    pub damage_description: Option<String>,
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
