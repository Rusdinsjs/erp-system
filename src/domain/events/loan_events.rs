//! Loan Domain Events

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::DomainEvent;

/// Loan requested event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanRequested {
    pub loan_id: Uuid,
    pub loan_number: String,
    pub asset_id: Uuid,
    pub borrower_id: Uuid,
    pub expected_return_date: NaiveDate,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for LoanRequested {
    fn event_type(&self) -> &'static str {
        "loan.requested"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.loan_id
    }
}

/// Loan approved event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanApproved {
    pub loan_id: Uuid,
    pub approved_by: Uuid,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for LoanApproved {
    fn event_type(&self) -> &'static str {
        "loan.approved"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.loan_id
    }
}

/// Loan checked out event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanCheckedOut {
    pub loan_id: Uuid,
    pub asset_id: Uuid,
    pub borrower_id: Uuid,
    pub checked_out_by: Uuid,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for LoanCheckedOut {
    fn event_type(&self) -> &'static str {
        "loan.checked_out"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.loan_id
    }
}

/// Loan returned event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanReturned {
    pub loan_id: Uuid,
    pub asset_id: Uuid,
    pub condition_after: Option<String>,
    pub checked_in_by: Uuid,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for LoanReturned {
    fn event_type(&self) -> &'static str {
        "loan.returned"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.loan_id
    }
}

/// Loan overdue event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoanOverdue {
    pub loan_id: Uuid,
    pub asset_id: Uuid,
    pub borrower_id: Uuid,
    pub days_overdue: i64,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for LoanOverdue {
    fn event_type(&self) -> &'static str {
        "loan.overdue"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.loan_id
    }
}
