use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub status: String, // 'open', 'closed'
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditRecord {
    pub id: Uuid,
    pub session_id: Uuid,
    pub asset_id: Uuid,
    pub status: String, // 'found', 'missing', 'damaged'
    pub notes: Option<String>,
    pub scanned_at: DateTime<Utc>,

    // Optional joined fields for display
    #[sqlx(default)]
    pub asset_code: Option<String>,
    #[sqlx(default)]
    pub asset_name: Option<String>,
}
