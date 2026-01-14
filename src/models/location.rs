use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Location model (hierarchical)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Location {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub r#type: Option<String>, // Country, City, Building, Floor, Room
    pub address: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Location for list view
#[derive(Debug, Serialize, FromRow)]
pub struct LocationList {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub r#type: Option<String>,
}

/// Location tree node
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct LocationTree {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub r#type: Option<String>,
    pub children: Vec<LocationTree>,
}

/// Create location request
#[derive(Debug, Deserialize)]
pub struct CreateLocationRequest {
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub r#type: Option<String>,
    pub address: Option<String>,
}

/// Update location request
#[derive(Debug, Deserialize)]
pub struct UpdateLocationRequest {
    pub parent_id: Option<Uuid>,
    pub code: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub address: Option<String>,
}
