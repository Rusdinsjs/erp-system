use crate::domain::entities::conversion::AssetConversion;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateConversionRequest {
    pub asset_id: Uuid,
    pub title: String,
    pub to_category_id: Uuid,
    pub target_specifications: Option<JsonValue>,
    pub conversion_cost: Decimal,
    pub cost_treatment: String, // capitalize, expense
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteConversionRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversionResponse {
    pub conversion: AssetConversion,
}
