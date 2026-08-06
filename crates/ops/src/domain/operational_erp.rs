use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// CRM Lead Entity (QCRM-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lead {
    pub id: Uuid,
    pub company_id: Uuid,
    pub lead_name: String,
    pub organization_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

/// CRM Opportunity Entity (QCRM-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Opportunity {
    pub id: Uuid,
    pub company_id: Uuid,
    pub lead_id: Option<Uuid>,
    pub title: String,
    pub estimated_value: Decimal,
    pub stage: String,
    pub expected_closing_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

/// Project Entity (QPRJ-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub company_id: Uuid,
    pub project_code: String,
    pub project_name: String,
    pub cost_center_id: Option<Uuid>,
    pub status: String,
    pub budget_amount: Decimal,
    pub created_at: DateTime<Utc>,
}

/// HR Employee Entity (QHR-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrEmployeeRecord {
    pub id: Uuid,
    pub company_id: Uuid,
    pub employee_code: String,
    pub full_name: String,
    pub department_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub joining_date: NaiveDate,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

/// Immutable Payroll Slip Entity (QHR-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollSlip {
    pub id: Uuid,
    pub company_id: Uuid,
    pub employee_id: Uuid,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub gross_salary: Decimal,
    pub total_deductions: Decimal,
    pub net_salary: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

/// Rental Contract Entity (QRNT-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RentalContractItem {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub asset_id: Uuid,
    pub monthly_rate: Decimal,
    pub billing_frequency: String,
    pub created_at: DateTime<Utc>,
}

/// Support Ticket Entity (QSUP-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupportTicket {
    pub id: Uuid,
    pub company_id: Uuid,
    pub ticket_number: String,
    pub subject: String,
    pub priority: String,
    pub status: String,
    pub asset_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
