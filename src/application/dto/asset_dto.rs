//! Asset DTOs

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use utoipa::ToSchema;

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct VehicleDetailsDto {
    #[schema(example = "B 1234 CD")]
    pub license_plate: Option<String>,
    #[schema(example = "Toyota")]
    pub brand: Option<String>,
    pub model: Option<String>,
    pub color: Option<String>,
    pub vin: Option<String>,
    pub engine_number: Option<String>,
    pub bpkb_number: Option<String>,
    // Dates need explicit type or example
    #[schema(value_type = Option<String>, example = "2025-01-01")]
    pub stnk_expiry: Option<NaiveDate>,
    #[schema(value_type = Option<String>, example = "2025-01-01")]
    pub kir_expiry: Option<NaiveDate>,
    #[schema(value_type = Option<String>, example = "2025-01-01")]
    pub tax_expiry: Option<NaiveDate>,
    pub fuel_type: Option<String>,
    pub transmission: Option<String>,
    pub capacity: Option<String>,
    pub odometer_last: Option<i64>,
}

/// Create asset request
#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct CreateAssetRequest {
    #[schema(example = "AST-006")]
    pub asset_code: String,
    #[schema(example = "New Asset")]
    pub name: String,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub is_rental: Option<bool>,
    pub is_fuel: Option<bool>,
    pub asset_class: Option<String>,
    pub status: Option<String>,
    pub condition_id: Option<i32>,
    pub serial_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year_manufacture: Option<i32>,
    #[schema(value_type = Option<Object>)]
    pub specifications: Option<JsonValue>,
    #[schema(value_type = Option<String>)]
    pub purchase_date: Option<NaiveDate>,
    #[schema(value_type = Option<f64>)]
    pub purchase_price: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub quantity: Option<i32>,
    #[schema(value_type = Option<f64>)]
    pub residual_value: Option<Decimal>,
    pub useful_life_months: Option<i32>,
    pub notes: Option<String>,
    pub vehicle_details: Option<VehicleDetailsDto>,
}

/// Bulk create asset request
#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct BulkCreateAssetRequest {
    pub assets: Vec<CreateAssetRequest>,
}

/// Update asset request
#[derive(Debug, Deserialize, Default, ToSchema)]
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
    pub is_fuel: Option<bool>,
    pub asset_class: Option<String>,
    pub status: Option<String>,
    pub condition_id: Option<i32>,
    pub serial_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year_manufacture: Option<i32>,
    #[schema(value_type = Option<Object>)]
    pub specifications: Option<JsonValue>,
    #[schema(value_type = Option<String>)]
    pub purchase_date: Option<NaiveDate>,
    #[schema(value_type = Option<f64>)]
    pub purchase_price: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub quantity: Option<i32>,
    #[schema(value_type = Option<f64>)]
    pub residual_value: Option<Decimal>,
    pub useful_life_months: Option<i32>,
    pub notes: Option<String>,
    pub vehicle_details: Option<VehicleDetailsDto>,
    pub version: Option<i32>,
}

/// Bulk update asset request
#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct BulkUpdateAssetRequest {
    pub asset_ids: Vec<Uuid>,
    pub status: Option<String>,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
}

/// Asset search parameters
#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct AssetSearchParams {
    pub query: Option<String>,
    pub category_id: Option<String>,
    pub location_id: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub is_fuel: Option<bool>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub exact_match: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

/// Asset transfer request
#[derive(Debug, Deserialize, ToSchema)]
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

/// Request to add a document to an asset
#[derive(Debug, Deserialize, ToSchema, Clone)]
pub struct CreateAssetDocumentRequest {
    #[schema(example = "Asset Photo 1")]
    pub name: String,
    #[schema(example = "PHOTO")]
    #[serde(rename = "type")]
    pub type_: String,
    #[schema(example = "/api/uploads/2024/01/01/uuid.jpg")]
    pub file_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    #[schema(value_type = Option<String>)]
    pub expiry_date: Option<NaiveDate>,
    pub notes: Option<String>,
}

/// Asset document response
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct AssetDocumentResponse {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub file_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub expiry_date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub uploaded_by: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Request to sell an asset
#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct SellAssetRequest {
    #[schema(example = "15000000")]
    pub sale_price: Decimal,
    #[schema(example = "2024-03-20")]
    pub sale_date: NaiveDate,
    #[schema(example = "PT. Buyer Sejahtera")]
    pub sold_to: String,
    pub notes: Option<String>,
}
