use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApprovalEntityType {
    pub id: Uuid,
    pub value: String,
    pub label: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
    pub backend_module: Option<String>,
    pub is_active: bool,
    pub is_system: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEntityTypeRequest {
    pub value: String,
    pub label: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
    pub backend_module: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEntityTypeRequest {
    pub label: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
    pub backend_module: Option<String>,
}
