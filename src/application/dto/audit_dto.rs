use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub entity_type: Option<String>, // e.g. "assets", "users"
    pub action: Option<String>,      // e.g. "UPDATE", "CREATE"
    pub user_id: Option<Uuid>,
    pub entity_id: Option<Uuid>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}
