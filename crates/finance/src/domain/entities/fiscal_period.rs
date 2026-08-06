use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Fiscal Year Entity (QACC-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FiscalYear {
    pub id: Uuid,
    pub company_id: Uuid,
    pub year_name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub is_closed: bool,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Accounting Period Entity (QACC-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountingPeriod {
    pub id: Uuid,
    pub fiscal_year_id: Uuid,
    pub period_name: String,
    pub period_number: i32,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub is_closed: bool,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create a Fiscal Year
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFiscalYearRequest {
    pub company_id: Uuid,
    pub year_name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

/// Request to create an Accounting Period
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountingPeriodRequest {
    pub fiscal_year_id: Uuid,
    pub period_name: String,
    pub period_number: i32,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}
