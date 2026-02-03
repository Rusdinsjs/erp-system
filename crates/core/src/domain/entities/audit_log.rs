use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub table_name: String,
    pub record_id: Uuid,
    pub action: String,
    pub old_values: Option<Value>,
    pub new_values: Option<Value>,
    pub user_id: Option<Uuid>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub entity_type: String, // mapped from table_name
    pub entity_id: Uuid,     // record_id
    pub action: String,
    pub user_name: Option<String>, // joined
    pub changes: Option<Value>,    // computed diff or raw
    pub timestamp: DateTime<Utc>,
}
