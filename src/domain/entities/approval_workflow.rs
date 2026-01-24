use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalWorkflow {
    pub id: Uuid,
    pub workflow_name: String,
    pub entity_type: String, // 'contract', 'rental', etc.
    pub approval_levels: i32,
    pub level_1_role: Option<String>,
    pub level_2_role: Option<String>,
    pub level_3_role: Option<String>,
    pub level_4_role: Option<String>,
    pub level_5_role: Option<String>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl ApprovalWorkflow {
    pub fn new(workflow_name: String, entity_type: String, approval_levels: i32) -> Self {
        Self {
            id: Uuid::new_v4(),
            workflow_name,
            entity_type,
            approval_levels,
            level_1_role: None,
            level_2_role: None,
            level_3_role: None,
            level_4_role: None,
            level_5_role: None,
            is_active: true,
            created_at: Some(Utc::now()),
            updated_at: Some(Utc::now()),
        }
    }
}
