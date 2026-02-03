//! Department Entity

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Department entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub cost_center: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Department {
    pub fn new(code: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            code,
            name,
            parent_id: None,
            organization_id: None,
            manager_id: None,
            cost_center: None,
            created_at: now,
            updated_at: now,
        }
    }
}
