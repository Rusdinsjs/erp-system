use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

/// Asset model - full representation
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Asset {
    pub id: Uuid,
    pub asset_code: String,
    pub name: String,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,

    pub is_rental: bool,
    pub asset_class: Option<String>,
    pub status: String,
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

    pub qr_code_url: Option<String>,
    pub notes: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Asset for list view (simplified)
#[derive(Debug, Serialize, FromRow)]
pub struct AssetList {
    pub id: Uuid,
    pub asset_code: String,
    pub name: String,
    pub status: String,
    pub asset_class: Option<String>,
    pub brand: Option<String>,
    pub purchase_price: Option<Decimal>,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
}

/// Asset with joined data for detail view
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct AssetDetail {
    #[serde(flatten)]
    pub asset: Asset,
    pub category_name: Option<String>,
    pub location_name: Option<String>,
    pub department_name: Option<String>,
    pub assigned_to_name: Option<String>,
    pub vendor_name: Option<String>,
    pub condition_name: Option<String>,
}

/// Create asset request
#[derive(Debug, Deserialize)]
pub struct CreateAssetRequest {
    pub asset_code: String,
    pub name: String,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,

    pub is_rental: Option<bool>,
    pub asset_class: Option<String>,
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
}

/// Update asset request
#[derive(Debug, Deserialize)]
pub struct UpdateAssetRequest {
    pub asset_code: Option<String>,
    pub name: Option<String>,
    pub category_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
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
}

/// Asset history entry
#[derive(Debug, Serialize, FromRow)]
#[allow(dead_code)]
pub struct AssetHistory {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub action: String,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_user_id: Option<Uuid>,
    pub to_user_id: Option<Uuid>,
    pub notes: Option<String>,
    pub performed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
