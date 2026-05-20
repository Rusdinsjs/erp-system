//! Asset Details Entities
//!
//! Entities for specific asset details (Vehicle, Insurance, Documents)

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

fn default_uuid() -> Uuid {
    Uuid::nil()
}

/// Vehicle Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VehicleDetails {
    #[serde(default = "default_uuid")]
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
    pub lapor_tiba_expiry: Option<NaiveDate>,
    pub heavy_equipment_tax_expiry: Option<NaiveDate>,
    pub fuel_type: Option<String>,
    pub transmission: Option<String>,
    pub capacity: Option<String>,
    pub odometer_last: Option<i64>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

fn default_datetime() -> DateTime<Utc> {
    Utc::now()
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
    #[sqlx(rename = "type")]
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

/// Land Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LandDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub certificate_number: Option<String>,
    pub land_area: Option<Decimal>,
    pub address: Option<String>,
    pub zoning: Option<String>,
    pub rights_status: Option<String>,
    pub rights_expiry: Option<NaiveDate>,
    pub pbb_number: Option<String>,
    pub njop_value: Option<Decimal>,
    pub gps_coordinates: Option<String>,
    pub boundaries: Option<String>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Building Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BuildingDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub land_asset_id: Option<Uuid>,
    pub building_area: Option<Decimal>,
    pub floor_count: Option<i32>,
    pub build_year: Option<i32>,
    pub renovation_year: Option<i32>,
    pub construction_type: Option<String>,
    pub building_function: Option<String>,
    pub capacity: Option<i32>,
    pub imb_number: Option<String>,
    pub slf_number: Option<String>,
    pub slf_expiry: Option<NaiveDate>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Heavy Equipment Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HeavyEquipmentDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub equipment_type: Option<String>,
    pub operating_weight: Option<Decimal>,
    pub capacity: Option<String>,
    pub engine_model: Option<String>,
    pub hour_meter: Option<Decimal>,
    pub certification_number: Option<String>,
    pub certification_expiry: Option<NaiveDate>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Machine Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MachineDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub machine_type: Option<String>,
    pub technical_specs: Option<String>,
    pub installation_year: Option<i32>,
    pub operating_hours: Option<Decimal>,
    pub energy_source: Option<String>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Inventory Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InventoryDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub inventory_type: Option<String>,
    pub warranty_expiry: Option<NaiveDate>,
    pub os_license: Option<String>,
    pub mac_address: Option<String>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Furniture Details (1:1 with Asset)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FurnitureDetails {
    #[serde(default = "default_uuid")]
    pub asset_id: Uuid,
    pub furniture_type: Option<String>,
    pub material: Option<String>,
    pub dimensions: Option<String>,
    pub color: Option<String>,
    pub capacity: Option<String>,
    #[serde(default = "default_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "default_datetime")]
    pub updated_at: DateTime<Utc>,
}
