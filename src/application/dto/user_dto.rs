use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String, // Will be hashed in service
    pub name: String,
    pub role_code: String, // Legacy support, also for lookup
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub role_code: Option<String>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub password: Option<String>, // Optional password update
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: String,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}
