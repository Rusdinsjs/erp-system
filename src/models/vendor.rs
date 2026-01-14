use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Vendor model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Vendor {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Vendor for list view
#[derive(Debug, Serialize, FromRow)]
pub struct VendorList {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
}

/// Create vendor request
#[derive(Debug, Deserialize)]
pub struct CreateVendorRequest {
    pub code: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
}

/// Update vendor request
#[derive(Debug, Deserialize)]
pub struct UpdateVendorRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub is_active: Option<bool>,
}
