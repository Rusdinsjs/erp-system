use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateInventoryCategoryRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub inventory_account_id: Option<Uuid>,
    pub expense_account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInventoryCategoryRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub inventory_account_id: Option<Uuid>,
    pub expense_account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInventoryItemRequest {
    pub category_id: Uuid,
    pub unit_id: i32,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub min_stock: Option<Decimal>,
    pub max_stock: Option<Decimal>,
    pub initial_quantity: Option<Decimal>,
    pub purchase_price: Option<Decimal>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInventoryItemRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub min_stock: Option<Decimal>,
    pub max_stock: Option<Decimal>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct InventoryAdjustmentRequest {
    pub quantity: Decimal,
    pub unit_price: Option<Decimal>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchInventoryAdjustmentRequest {
    pub items: Vec<InventoryAdjustmentItem>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InventoryAdjustmentItem {
    pub item_id: Uuid,
    pub quantity: Decimal, // The adjustment amount (can be positive or negative)
    pub unit_price: Option<Decimal>,
}
