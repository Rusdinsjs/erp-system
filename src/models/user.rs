use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// User model - full representation
#[derive(Debug, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,
    pub role: String,
    pub department_id: Option<Uuid>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// User for list view (without password)
#[derive(Debug, Serialize, FromRow)]
#[allow(dead_code)]
pub struct UserList {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub department_id: Option<Uuid>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// Create user request
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: Option<String>,
    pub department_id: Option<Uuid>,
}

/// Update user request
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub name: Option<String>,
    pub role: Option<String>,
    pub department_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

/// Login request
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

/// User info in token response
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
}

/// Department model
#[derive(Debug, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct Department {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create department request
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CreateDepartmentRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
}
