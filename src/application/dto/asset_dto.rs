//! Asset DTOs

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VehicleDetailsDto {
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
}

/// Create asset request
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateAssetRequest {
    pub asset_code: String,
    pub name: String,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub is_rental: Option<bool>,
    pub asset_class: Option<String>,
    pub status: Option<String>,
    pub condition_id: Option<i32>,
    pub serial_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year_manufacture: Option<i32>,
    pub specifications: Option<JsonValue>,
    pub purchase_date: Option<NaiveDate>,
    pub purchase_price: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub quantity: Option<i32>,
    pub residual_value: Option<Decimal>,
    pub useful_life_months: Option<i32>,
    pub notes: Option<String>,
    pub vehicle_details: Option<VehicleDetailsDto>,
}

/// Bulk create asset request
#[derive(Debug, Deserialize, Serialize)]
pub struct BulkCreateAssetRequest {
    pub assets: Vec<CreateAssetRequest>,
}

/// Update asset request
#[derive(Debug, Deserialize, Default)]
pub struct UpdateAssetRequest {
    pub asset_code: Option<String>,
    pub name: Option<String>,
    pub category_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub is_rental: Option<bool>,
    pub asset_class: Option<String>,
    pub status: Option<String>,
    pub condition_id: Option<i32>,
    pub serial_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year_manufacture: Option<i32>,
    pub specifications: Option<JsonValue>,
    pub purchase_date: Option<NaiveDate>,
    pub purchase_price: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub quantity: Option<i32>,
    pub residual_value: Option<Decimal>,
    pub useful_life_months: Option<i32>,
    pub notes: Option<String>,
    pub vehicle_details: Option<VehicleDetailsDto>,
}

/// Asset search parameters
#[derive(Debug, Deserialize)]
pub struct AssetSearchParams {
    pub query: Option<String>,
    pub category_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

/// Asset transfer request
#[derive(Debug, Deserialize)]
pub struct AssetTransferRequest {
    pub to_location_id: Uuid,
    pub notes: Option<String>,
}

/// Asset assign request
#[derive(Debug, Deserialize)]
pub struct AssetAssignRequest {
    pub assigned_to: Uuid,
    pub notes: Option<String>,
}
