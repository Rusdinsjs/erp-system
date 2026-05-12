use serde::Deserialize;
use uuid::Uuid;

use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreateUserRequest {
    #[schema(example = "newuser@example.com")]
    pub email: String,
    #[schema(example = "Secret123!")]
    pub password: String, // Will be hashed in service
    #[schema(example = "John Doe")]
    pub name: String,
    #[schema(example = "user")]
    pub role_code: String, // Legacy support, also for lookup
    #[schema(example = "Engineering")]
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
}

impl std::fmt::Debug for CreateUserRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CreateUserRequest")
            .field("email", &self.email)
            .field("password", &"[REDACTED]")
            .field("name", &self.name)
            .field("role_code", &self.role_code)
            .field("department", &self.department)
            .field("department_id", &self.department_id)
            .field("organization_id", &self.organization_id)
            .finish()
    }
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub role_code: Option<String>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub password: Option<String>, // Optional password update
    pub avatar_url: Option<String>,
}

impl std::fmt::Debug for UpdateUserRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("UpdateUserRequest")
            .field("name", &self.name)
            .field("role_code", &self.role_code)
            .field("department", &self.department)
            .field("department_id", &self.department_id)
            .field("is_active", &self.is_active)
            .field("password", &self.password.as_ref().map(|_| "[REDACTED]"))
            .field("avatar_url", &self.avatar_url)
            .finish()
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: String,
    pub phone: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

impl std::fmt::Debug for ChangePasswordRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChangePasswordRequest")
            .field("old_password", &"[REDACTED]")
            .field("new_password", &"[REDACTED]")
            .finish()
    }
}
