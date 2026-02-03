use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateLeaveRequest {
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub days_count: i32,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RejectLeaveRequest {
    pub reason: String,
}
