//! Asset Details Entities
//!
//! Entities for specific asset details (Vehicle, Insurance, Documents)

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Vehicle Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VehicleDetails {
    pub asset_id: Uuid,
    pub license_plate: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub color: Option<String>,
    pub vin: Option<String>,
    pub engine_number: Option<String>,
    pub bpkb_number: Option<String>,
    pub stnk_expiry: Option<NaiveDate>,
    pub kir_expiry: Option<NaiveDate>,
    pub tax_expiry: Option<NaiveDate>,
    pub fuel_type: Option<String>,
    pub transmission: Option<String>,
    pub capacity: Option<String>,
    pub odometer_last: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Insurance Details (1:N with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Insurance {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub policy_number: String,
    pub insurance_provider: String,
    pub coverage_type: Option<String>,
    pub coverage_amount: Option<Decimal>,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub premium_amount: Option<Decimal>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Asset Document (1:N with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssetDocument {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub name: String,
    pub type_: String, // type is reserved keyword
    pub file_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub expiry_date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub uploaded_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Renaming for SQLx mapping if needed, usually type needs rename
// but sqlx generic rename is per struct field
