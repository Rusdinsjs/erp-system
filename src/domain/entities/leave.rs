use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveStatus {
    Pending,
    Approved,
    Rejected,
}

impl LeaveStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "approved" => Self::Approved,
            "rejected" => Self::Rejected,
            _ => Self::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: String, // 'annual', 'sick', etc.
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub days_count: i32,
    pub reason: Option<String>,
    pub status: String, // stored as string
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joins
    #[sqlx(default)]
    pub employee_name: Option<String>,
    #[sqlx(default)]
    pub approver_name: Option<String>,
}

impl LeaveRequest {
    pub fn status_enum(&self) -> LeaveStatus {
        LeaveStatus::from_str(&self.status)
    }
}
