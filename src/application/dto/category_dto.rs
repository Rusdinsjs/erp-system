//! Category DTOs
//!
//! Data Transfer Objects for category operations.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Request to create a new category
#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub main_category: Option<String>,
    pub sub_category_letter: Option<String>,
    pub function_description: Option<String>,
    pub example_assets: Option<Vec<String>>,
    pub display_order: Option<i32>,
}

/// Request to update a category
#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub main_category: Option<String>,
    pub sub_category_letter: Option<String>,
    pub function_description: Option<String>,
    pub example_assets: Option<Vec<String>>,
    pub display_order: Option<i32>,
}

/// Category response with all fields
#[derive(Debug, Serialize)]
pub struct CategoryResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub department: Option<String>,
    pub description: Option<String>,
    pub main_category: Option<String>,
    pub sub_category_letter: Option<String>,
    pub function_description: Option<String>,
    pub example_assets: Option<Vec<String>>,
    pub display_order: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Category tree node for hierarchical display
#[derive(Debug, Serialize)]
pub struct CategoryTreeNode {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub department: Option<String>,
    pub description: Option<String>,
    pub main_category: Option<String>,
    pub sub_category_letter: Option<String>,
    pub function_description: Option<String>,
    pub example_assets: Option<Vec<String>>,
    pub display_order: i32,
    pub level: u32,
    pub children: Vec<CategoryTreeNode>,
}

/// Categories grouped by main category
#[derive(Debug, Serialize)]
pub struct CategoryClassification {
    pub main_category: String,
    pub description: String,
    pub function_description: String,
    pub sub_categories: Vec<SubCategoryItem>,
}

/// Sub-category item in classification
#[derive(Debug, Serialize)]
pub struct SubCategoryItem {
    pub id: Uuid,
    pub letter: String,
    pub name: String,
    pub description: Option<String>,
    pub function_description: Option<String>,
    pub example_assets: Vec<String>,
}
