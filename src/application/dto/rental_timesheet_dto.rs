//! Rental Timesheet DTOs
//!
//! Data Transfer Objects for timesheet and billing operations.

use chrono::{NaiveDate, NaiveTime};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// =============================================================================
// TIMESHEET DTOs
// =============================================================================

/// Create timesheet entry (by Checker)
#[derive(Debug, Deserialize)]
pub struct CreateTimesheetRequest {
    pub rental_id: Uuid,
    pub work_date: NaiveDate,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub operating_hours: Decimal,
    pub standby_hours: Option<Decimal>,
    pub breakdown_hours: Option<Decimal>,
    pub hm_km_start: Option<Decimal>,
    pub hm_km_end: Option<Decimal>,
    pub operation_status: String, // 'operating', 'standby', 'breakdown', 'off'
    pub breakdown_reason: Option<String>,
    pub work_description: Option<String>,
    pub work_location: Option<String>,
    pub photos: Option<Vec<String>>,
    pub notes: Option<String>,
}

/// Update timesheet entry
#[derive(Debug, Deserialize)]
pub struct UpdateTimesheetRequest {
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub operating_hours: Option<Decimal>,
    pub standby_hours: Option<Decimal>,
    pub breakdown_hours: Option<Decimal>,
    pub hm_km_start: Option<Decimal>,
    pub hm_km_end: Option<Decimal>,
    pub operation_status: Option<String>,
    pub breakdown_reason: Option<String>,
    pub work_description: Option<String>,
    pub work_location: Option<String>,
    pub photos: Option<Vec<String>>,
    pub notes: Option<String>,
}

/// Submit timesheet for verification (Checker → Verifier)
#[derive(Debug, Deserialize)]
pub struct SubmitTimesheetRequest {
    pub checker_notes: Option<String>,
}

/// Verify timesheet (by Verifier)
#[derive(Debug, Deserialize)]
pub struct VerifyTimesheetRequest {
    pub status: String, // 'approved', 'rejected', 'revision'
    pub notes: Option<String>,
}

/// Client PIC approval
#[derive(Debug, Deserialize)]
pub struct ClientApproveTimesheetRequest {
    pub client_pic_id: Uuid,
    pub signature: Option<String>,
    pub notes: Option<String>,
}

/// Timesheet summary response
#[derive(Debug, Serialize)]
pub struct TimesheetSummary {
    pub rental_id: Uuid,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub total_entries: i64,
    pub total_operating_hours: Decimal,
    pub total_standby_hours: Decimal,
    pub total_overtime_hours: Decimal,
    pub total_breakdown_hours: Decimal,
    pub total_hm_km_usage: Decimal,
    pub approved_entries: i64,
    pub pending_entries: i64,
}

/// Enhanced timesheet response with rental and asset info
#[derive(Debug, Serialize)]
pub struct TimesheetDetailResponse {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub rental_number: String,
    pub asset_name: String,
    pub client_name: String,
    pub work_date: NaiveDate,
    pub operating_hours: Decimal,
    pub standby_hours: Decimal,
    pub overtime_hours: Decimal,
    pub breakdown_hours: Decimal,
    pub hm_km_start: Option<Decimal>,
    pub hm_km_end: Option<Decimal>,
    pub hm_km_usage: Option<Decimal>,
    pub operation_status: String,
    pub work_description: Option<String>,
    pub photos: Option<serde_json::Value>,
    pub status: String,
    pub checker_notes: Option<String>,
}

// =============================================================================
// BILLING DTOs
// =============================================================================

/// Create billing period
#[derive(Debug, Deserialize)]
pub struct CreateBillingPeriodRequest {
    pub rental_id: Uuid,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub period_type: Option<String>, // 'daily', 'weekly', 'biweekly', 'monthly'
}

/// Calculate billing (accumulate from timesheets)
#[derive(Debug, Deserialize)]
pub struct CalculateBillingRequest {
    pub mobilization_fee: Option<Decimal>,
    pub demobilization_fee: Option<Decimal>,
    pub other_charges: Option<Decimal>,
    pub other_charges_description: Option<String>,
    pub discount_percentage: Option<Decimal>,
}

/// Approve billing
#[derive(Debug, Deserialize)]
pub struct ApproveBillingRequest {
    pub notes: Option<String>,
}

/// Generate invoice
#[derive(Debug, Deserialize)]
pub struct GenerateInvoiceRequest {
    pub invoice_number: Option<String>, // If not provided, auto-generate
    pub due_days: Option<i32>,          // Days from invoice date, default 30
}

/// Billing summary response
#[derive(Debug, Serialize)]
pub struct BillingSummaryResponse {
    pub period: String,
    pub rental_number: String,
    pub client_name: String,
    pub asset_name: String,

    // Hours breakdown
    pub total_operating_hours: Decimal,
    pub total_standby_hours: Decimal,
    pub total_overtime_hours: Decimal,
    pub total_breakdown_hours: Decimal,
    pub minimum_hours: Decimal,
    pub billable_hours: Decimal,
    pub shortfall_hours: Decimal,

    // Rates
    pub rate_basis: String,
    pub hourly_rate: Decimal,
    pub overtime_multiplier: Decimal,
    pub standby_multiplier: Decimal,
    pub breakdown_penalty_per_day: Decimal,

    // Financial breakdown
    pub base_amount: Decimal,
    pub standby_amount: Decimal,
    pub overtime_amount: Decimal,
    pub breakdown_penalty_amount: Decimal,
    pub mobilization_fee: Decimal,
    pub demobilization_fee: Decimal,
    pub other_charges: Decimal,

    pub subtotal: Decimal,
    pub discount_percentage: Decimal,
    pub discount_amount: Decimal,
    pub tax_percentage: Decimal,
    pub tax_amount: Decimal,
    pub total_amount: Decimal,

    pub status: String,
    pub invoice_number: Option<String>,
    pub timesheets: Vec<crate::domain::entities::RentalTimesheet>,
}

// =============================================================================
// ENHANCED RATE DTOs
// =============================================================================

/// Enhanced rate configuration request
#[derive(Debug, Deserialize)]
pub struct CreateEnhancedRateRequest {
    pub name: String,
    pub category_id: Option<Uuid>,
    pub asset_id: Option<Uuid>,

    // Basis calculation
    pub rate_basis: String, // 'hourly', 'daily', 'monthly'
    pub rate_amount: Decimal,
    pub currency: Option<String>,

    // Custom multipliers
    pub minimum_hours: Option<Decimal>,             // Default 200
    pub overtime_multiplier: Option<Decimal>,       // Default 1.25 (125%)
    pub standby_multiplier: Option<Decimal>,        // Default 0.50 (50%)
    pub breakdown_penalty_per_day: Option<Decimal>, // Custom

    // Working time configuration
    pub hours_per_day: Option<Decimal>, // Default 8
    pub days_per_month: Option<i32>,    // Default 25

    pub deposit_percentage: Option<Decimal>,
}

// =============================================================================
// CLIENT CONTACT DTOs
// =============================================================================

/// Create client contact (PIC)
#[derive(Debug, Deserialize)]
pub struct CreateClientContactRequest {
    pub client_id: Uuid,
    pub name: String,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub can_approve_timesheet: Option<bool>,
    pub can_approve_billing: Option<bool>,
    pub approval_limit: Option<Decimal>,
    pub is_primary: Option<bool>,
}

/// Update client contact
#[derive(Debug, Deserialize)]
pub struct UpdateClientContactRequest {
    pub name: Option<String>,
    pub position: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub can_approve_timesheet: Option<bool>,
    pub can_approve_billing: Option<bool>,
    pub approval_limit: Option<Decimal>,
    pub is_primary: Option<bool>,
    pub is_active: Option<bool>,
}
