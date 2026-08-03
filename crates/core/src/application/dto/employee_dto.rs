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
    pub photo_url: Option<String>,
    pub is_account_requested: Option<bool>,

    // Extensions
    pub ktp_number: Option<String>,
    pub place_of_birth: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub gender: Option<String>,
    pub marital_status: Option<String>,
    pub religion: Option<String>,
    pub address: Option<String>,

    pub start_date: Option<chrono::NaiveDate>,
    pub end_contract_date: Option<chrono::NaiveDate>,
    pub is_manager: Option<bool>,
    pub manager_id: Option<Uuid>,

    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub basic_salary: Option<rust_decimal::Decimal>,

    pub user_creation: Option<CreateEmployeeUserRequest>,
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
    pub photo_url: Option<String>,
    pub is_account_requested: Option<bool>,

    // Extensions
    pub ktp_number: Option<String>,
    pub place_of_birth: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub gender: Option<String>,
    pub marital_status: Option<String>,
    pub religion: Option<String>,
    pub address: Option<String>,
    pub blood_type: Option<String>,

    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relation: Option<String>,

    pub start_date: Option<chrono::NaiveDate>,
    pub end_contract_date: Option<chrono::NaiveDate>,
    pub is_manager: Option<bool>,
    pub manager_id: Option<Uuid>,

    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub npwp: Option<String>,
    pub bpjs_kesehatan: Option<String>,
    pub bpjs_tenaga_kerja: Option<String>,
    pub basic_salary: Option<rust_decimal::Decimal>,

    pub education: Option<String>,

    pub user_creation: Option<CreateEmployeeUserRequest>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateEmployeeUserRequest {
    pub email: String,
    pub password: String,
    pub role: String,
}
