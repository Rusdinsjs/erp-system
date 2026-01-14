//! Asset Conversion Entity

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssetConversion {
    pub id: Uuid,
    pub request_number: String,
    pub asset_id: Uuid,
    pub title: String,

    pub status: String, // pending, approved, rejected, executed, cancelled

    pub from_category_id: Option<Uuid>, // Optional because created from join or logic
    pub to_category_id: Uuid,
    pub target_specifications: Option<JsonValue>,

    pub conversion_cost: Decimal,
    pub cost_treatment: String, // capitalize, expense

    pub reason: Option<String>,
    pub notes: Option<String>,

    pub requested_by: Uuid,
    pub approved_by: Option<Uuid>,
    pub executed_by: Option<Uuid>,

    pub request_date: Option<DateTime<Utc>>,
    pub approval_date: Option<DateTime<Utc>>,
    pub execution_date: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
