use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MaintenanceTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub asset_category_id: Option<Uuid>,
    pub version: i32,
    pub is_active: bool,
    pub parent_id: Option<Uuid>,
    pub usage_count: i32,
    pub last_used_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TemplateTask {
    pub id: Uuid,
    pub template_id: Uuid,
    pub task_number: i32,
    pub description: String,
    pub instructions: Option<String>,
    pub expected_result: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceTemplateWithTasks {
    #[serde(flatten)]
    pub template: MaintenanceTemplate,
    pub tasks: Vec<TemplateTask>,
}

impl MaintenanceTemplate {
    pub fn new(name: String, description: Option<String>, asset_category_id: Option<Uuid>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            description,
            asset_category_id,
            version: 1,
            is_active: true,
            parent_id: None,
            usage_count: 0,
            last_used_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl TemplateTask {
    pub fn new(
        template_id: Uuid,
        task_number: i32,
        description: String,
        instructions: Option<String>,
        expected_result: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            template_id,
            task_number,
            description,
            instructions,
            expected_result,
            created_at: Utc::now(),
        }
    }
}
