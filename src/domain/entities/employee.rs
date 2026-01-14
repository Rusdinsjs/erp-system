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
    pub employment_status: String, // Stored as string in DB
    pub user_id: Option<Uuid>,
    pub is_active: bool,
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
