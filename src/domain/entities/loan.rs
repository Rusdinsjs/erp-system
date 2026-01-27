//! Loan Entity
//!
//! Asset loan management with complete workflow support.
//!

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::str::FromStr;
use uuid::Uuid;

/// Loan status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LoanStatus {
    Requested,
    Approved,
    Rejected,
    CheckedOut,
    InUse,
    Overdue,
    Returned,
    Damaged,
    Lost,
}

impl FromStr for LoanStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "requested" => Ok(Self::Requested),
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            "checked_out" => Ok(Self::CheckedOut),
            "in_use" => Ok(Self::InUse),
            "overdue" => Ok(Self::Overdue),
            "returned" => Ok(Self::Returned),
            "damaged" => Ok(Self::Damaged),
            "lost" => Ok(Self::Lost),
            _ => Err(format!("Invalid loan status: {}", s)),
        }
    }
}

impl LoanStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Requested => "requested",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::CheckedOut => "checked_out",
            Self::InUse => "in_use",
            Self::Overdue => "overdue",
            Self::Returned => "returned",
            Self::Damaged => "damaged",
            Self::Lost => "lost",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as FromStr>::from_str(s).ok()
    }
}

/// Asset Loan
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Loan {
    pub id: Uuid,
    pub loan_number: String,
    pub asset_id: Uuid,
    pub borrower_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub approver_id: Option<Uuid>,

    // Dates
    pub loan_date: NaiveDate,
    pub expected_return_date: NaiveDate,
    pub actual_return_date: Option<NaiveDate>,

    // Status
    pub status: String,

    // Condition tracking
    pub condition_before: Option<String>,
    pub condition_after: Option<String>,
    pub damage_description: Option<String>,
    pub damage_photos: Option<Vec<String>>,
    pub handover_photo: Option<String>,
    pub return_photo: Option<String>,

    // Agreement
    pub terms_accepted: bool,
    pub agreement_document: Option<String>,

    // Financial
    pub deposit_amount: Option<Decimal>,
    pub deposit_returned: bool,
    pub penalty_amount: Option<Decimal>,
    pub penalty_paid: bool,

    // Checkout/Checkin
    pub checked_out_by: Option<Uuid>,
    pub checked_in_by: Option<Uuid>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joined fields
    #[sqlx(default)]
    pub borrower_name: Option<String>,
    #[sqlx(default)]
    pub employee_name: Option<String>,
    #[sqlx(default)]
    pub asset_name: Option<String>,
}

impl Loan {
    pub fn new(
        asset_id: Uuid,
        borrower_id: Option<Uuid>,
        employee_id: Option<Uuid>,
        loan_date: NaiveDate,
        expected_return_date: NaiveDate,
    ) -> Self {
        let now = Utc::now();
        let loan_number = format!("LN-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            loan_number,
            asset_id,
            borrower_id,
            employee_id,
            approver_id: None,
            loan_date,
            expected_return_date,
            actual_return_date: None,
            status: LoanStatus::Requested.as_str().to_string(),
            condition_before: None,
            condition_after: None,
            damage_description: None,
            damage_photos: None,
            terms_accepted: false,
            agreement_document: None,
            deposit_amount: None,
            deposit_returned: false,
            penalty_amount: None,
            penalty_paid: false,
            checked_out_by: None,
            checked_in_by: None,
            handover_photo: None,
            return_photo: None,
            created_at: now,
            updated_at: now,
            borrower_name: None,
            employee_name: None,
            asset_name: None,
        }
    }

    /// Check if loan is overdue
    pub fn is_overdue(&self) -> bool {
        let today = Utc::now().date_naive();
        self.expected_return_date < today
            && self.actual_return_date.is_none()
            && !matches!(
                <LoanStatus as FromStr>::from_str(&self.status),
                Ok(LoanStatus::Returned) | Ok(LoanStatus::Lost) | Ok(LoanStatus::Rejected)
            )
    }

    /// Calculate days overdue
    pub fn days_overdue(&self) -> i64 {
        if !self.is_overdue() {
            return 0;
        }
        let today = Utc::now().date_naive();
        (today - self.expected_return_date).num_days()
    }

    /// Can be checked out
    pub fn can_checkout(&self) -> bool {
        self.status == LoanStatus::Approved.as_str()
    }

    /// Can be returned
    pub fn can_return(&self) -> bool {
        matches!(
            <LoanStatus as FromStr>::from_str(&self.status),
            Ok(LoanStatus::CheckedOut) | Ok(LoanStatus::InUse) | Ok(LoanStatus::Overdue)
        )
    }
}

/// Loan summary for list views
#[derive(Debug, Clone, Serialize)]
pub struct LoanSummary {
    pub id: Uuid,
    pub loan_number: String,
    pub asset_id: Uuid,
    pub asset_name: Option<String>,
    pub borrower_name: Option<String>,
    pub loan_date: NaiveDate,
    pub expected_return_date: NaiveDate,
    pub status: String,
    pub is_overdue: bool,
    pub employee_id: Option<Uuid>,
    pub handover_photo: Option<String>,
    pub return_photo: Option<String>,
}

/// Loan request for creating new loans
#[derive(Debug, Clone, Deserialize)]
pub struct LoanRequest {
    pub asset_id: Uuid,
    pub borrower_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub loan_date: NaiveDate,
    pub expected_return_date: NaiveDate,
    pub purpose: Option<String>,
    pub deposit_amount: Option<Decimal>,
}
