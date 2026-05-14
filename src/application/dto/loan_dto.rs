//! Loan DTOs

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

use utoipa::ToSchema;
use serde::Serialize;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateLoanRequest {
    pub asset_id: Uuid,
    pub borrower_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub loan_date: NaiveDate,
    pub expected_return_date: NaiveDate,
    pub purpose: Option<String>,
    pub deposit_amount: Option<Decimal>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApproveLoanRequest {
    pub approved: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CheckoutLoanRequest {
    pub condition_before: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CheckinLoanRequest {
    pub condition_after: String,
    pub damage_description: Option<String>,
    pub penalty_amount: Option<Decimal>,
}
