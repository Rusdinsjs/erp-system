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
    #[schema(value_type = String, format = Date)]
    pub lapor_tiba_expiry: Option<NaiveDate>,
    #[schema(value_type = String, format = Date)]
    pub heavy_equipment_tax_expiry: Option<NaiveDate>,
    pub fuel_type: Option<String>,
    pub transmission: Option<String>,
    pub capacity: Option<String>,
    pub odometer_last: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct LandDetailsDto {
    pub certificate_number: Option<String>,
    pub land_area: Option<Decimal>,
    pub address: Option<String>,
    pub zoning: Option<String>,
    pub rights_status: Option<String>,
    #[schema(value_type = Option<String>, format = Date)]
    pub rights_expiry: Option<NaiveDate>,
    pub pbb_number: Option<String>,
    pub njop_value: Option<Decimal>,
    pub gps_coordinates: Option<String>,
    pub boundaries: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct BuildingDetailsDto {
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
    #[schema(value_type = Option<String>, format = Date)]
    pub slf_expiry: Option<NaiveDate>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct HeavyEquipmentDetailsDto {
    pub equipment_type: Option<String>,
    pub operating_weight: Option<Decimal>,
    pub capacity: Option<String>,
    pub engine_model: Option<String>,
    pub hour_meter: Option<Decimal>,
    pub certification_number: Option<String>,
    #[schema(value_type = Option<String>, format = Date)]
    pub certification_expiry: Option<NaiveDate>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct MachineDetailsDto {
    pub machine_type: Option<String>,
    pub technical_specs: Option<String>,
    pub installation_year: Option<i32>,
    pub operating_hours: Option<Decimal>,
    pub energy_source: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct InventoryDetailsDto {
    pub inventory_type: Option<String>,
    #[schema(value_type = Option<String>, format = Date)]
    pub warranty_expiry: Option<NaiveDate>,
    pub os_license: Option<String>,
    pub mac_address: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct FurnitureDetailsDto {
    pub furniture_type: Option<String>,
    pub material: Option<String>,
    pub dimensions: Option<String>,
    pub color: Option<String>,
    pub capacity: Option<String>,
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
    pub company_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub is_rental: Option<bool>,
    pub is_fuel: Option<bool>,
    pub is_loan: Option<bool>,
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

    // General Details (assets.txt additions)
    pub description: Option<String>,
    pub acquisition_method: Option<String>,
    pub funding_source: Option<String>,

    pub vehicle_details: Option<VehicleDetailsDto>,
    pub land_details: Option<LandDetailsDto>,
    pub building_details: Option<BuildingDetailsDto>,
    pub heavy_equipment_details: Option<HeavyEquipmentDetailsDto>,
    pub machine_details: Option<MachineDetailsDto>,
    pub inventory_details: Option<InventoryDetailsDto>,
    pub furniture_details: Option<FurnitureDetailsDto>,
    
    // Metadata Engine
    #[schema(value_type = Option<Object>)]
    pub custom_data: Option<JsonValue>,
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
    pub company_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub is_rental: Option<bool>,
    pub is_fuel: Option<bool>,
    pub is_loan: Option<bool>,
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

    // General Details (assets.txt additions)
    pub description: Option<String>,
    pub acquisition_method: Option<String>,
    pub funding_source: Option<String>,

    pub vehicle_details: Option<VehicleDetailsDto>,
    pub land_details: Option<LandDetailsDto>,
    pub building_details: Option<BuildingDetailsDto>,
    pub heavy_equipment_details: Option<HeavyEquipmentDetailsDto>,
    pub machine_details: Option<MachineDetailsDto>,
    pub inventory_details: Option<InventoryDetailsDto>,
    pub furniture_details: Option<FurnitureDetailsDto>,

    // Metadata Engine
    #[schema(value_type = Option<Object>)]
    pub custom_data: Option<JsonValue>,

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
    pub asset_group: Option<String>,
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
