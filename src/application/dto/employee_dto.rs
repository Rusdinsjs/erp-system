use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEmployeeRequest {
    pub nik: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub employment_status: String,
    pub user_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub nik: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub employment_status: Option<String>,
    pub user_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEmployeeUserRequest {
    pub email: String,
    pub password: String,
    pub role: String,
}
