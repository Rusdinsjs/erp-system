use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Notification Template entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NotificationTemplate {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub subject_template: Option<String>,
    pub body_template: Option<String>,
    pub channels: Vec<String>,
    pub event_type: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Notification entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub template_id: Option<Uuid>,
    pub title: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub channel: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub is_read: bool,
    pub read_at: Option<DateTime<Utc>>,
    pub is_sent: bool,
    pub sent_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// User notification preference
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NotificationPreference {
    pub id: Uuid,
    pub user_id: Uuid,
    pub template_id: Option<Uuid>,
    pub event_type: Option<String>,
    pub email_enabled: bool,
    pub push_enabled: bool,
    pub sms_enabled: bool,
    pub in_app_enabled: bool,
    pub digest_frequency: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
