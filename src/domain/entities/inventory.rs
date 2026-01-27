use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryCategory {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub inventory_account_id: Option<Uuid>,
    pub expense_account_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryItem {
    pub id: Uuid,
    pub category_id: Uuid,
    pub unit_id: i32,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub min_stock: Decimal,
    pub max_stock: Decimal,
    pub current_quantity: Decimal,
    pub average_cost: Decimal,
    pub last_purchase_price: Decimal,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "inventory_movement_type")]
pub enum InventoryMovementType {
    #[serde(rename = "IN_PURCHASE")]
    InPurchase,
    #[serde(rename = "IN_ADJUSTMENT")]
    InAdjustment,
    #[serde(rename = "OUT_USAGE")]
    OutUsage,
    #[serde(rename = "OUT_ADJUSTMENT")]
    OutAdjustment,
    #[serde(rename = "OUT_TRANSFER")]
    OutTransfer,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryMovement {
    pub id: Uuid,
    pub item_id: Uuid,
    pub movement_type: InventoryMovementType,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub total_value: Decimal,
    pub reference_id: Option<Uuid>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
