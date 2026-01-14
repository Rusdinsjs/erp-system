use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EmploymentStatus {
    Pkwt,
    Pkwtt,
    Magang,
    Lainnya,
}

impl EmploymentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pkwt => "pkwt",
            Self::Pkwtt => "pkwtt",
            Self::Magang => "magang",
            Self::Lainnya => "lainnya",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "pkwt" => Some(Self::Pkwt),
            "pkwtt" => Some(Self::Pkwtt),
            "magang" => Some(Self::Magang),
            "lainnya" => Some(Self::Lainnya),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id: Uuid,
    pub nik: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub position: Option<String>,
    pub employment_status: String,
    pub user_id: Option<Uuid>,
    pub is_active: bool,

    // Biodata
    pub ktp_number: Option<String>,
    pub place_of_birth: Option<String>,
    pub date_of_birth: Option<chrono::NaiveDate>,
    pub gender: Option<String>,
    pub marital_status: Option<String>,
    pub religion: Option<String>,
    pub address: Option<String>,
    pub blood_type: Option<String>,

    // Emergency Contact
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub emergency_contact_relation: Option<String>,

    // Employment Details
    pub start_date: Option<chrono::NaiveDate>,
    pub end_contract_date: Option<chrono::NaiveDate>,
    pub is_manager: bool,
    pub manager_id: Option<Uuid>,

    // Payroll
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub npwp: Option<String>,
    pub bpjs_kesehatan: Option<String>,
    pub bpjs_tenaga_kerja: Option<String>,
    pub basic_salary: Option<rust_decimal::Decimal>,

    // Education
    pub education: Option<String>,

    // Leave
    pub leave_balance: i32,
    pub leave_used: i32,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Optional joined fields
    #[sqlx(default)]
    pub department_name: Option<String>,
}

impl Employee {
    pub fn status(&self) -> EmploymentStatus {
        EmploymentStatus::from_str(&self.employment_status).unwrap_or(EmploymentStatus::Lainnya)
    }
}
