use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveStatus {
    Pending,
    Approved,
    Rejected,
}

impl FromStr for LeaveStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            "pending" => Ok(Self::Pending),
            _ => Err(format!("Invalid leave status: {}", s)),
        }
    }
}

impl LeaveStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as FromStr>::from_str(s).ok()
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
        <LeaveStatus as FromStr>::from_str(&self.status).unwrap_or(LeaveStatus::Pending)
    }
}
