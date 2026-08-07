use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workflow {
    pub id: Uuid,
    pub workflow_name: String,
    pub doctype_id: Uuid,
    pub is_active: bool,
    pub document_status_field: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowState {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub state_name: String,
    pub doc_status: i32,
    pub allow_edit_role_id: Option<Uuid>,
    pub style_variant: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowTransition {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub state_id: Uuid,
    pub action_name: String,
    pub next_state_id: Uuid,
    pub allowed_role_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowActionLog {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub document_id: Uuid,
    pub action_by_user_id: Uuid,
    pub from_state: String,
    pub action_name: String,
    pub to_state: String,
    pub comments: Option<String>,
    pub created_at: DateTime<Utc>,
}
