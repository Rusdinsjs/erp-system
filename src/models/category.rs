use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

/// Category model (tree structure)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Category for list view
#[derive(Debug, Serialize, FromRow)]
pub struct CategoryList {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
}

/// Category tree node (with children)
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct CategoryTree {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<JsonValue>,
    pub children: Vec<CategoryTree>,
}

/// Create category request
#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub attributes: Option<JsonValue>,
}

/// Update category request
#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub parent_id: Option<Uuid>,
    pub code: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub attributes: Option<JsonValue>,
}
