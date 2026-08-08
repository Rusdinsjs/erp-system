use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MonthlyTrend {
    pub month: String,
    pub total_cost: Decimal,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConditionDistribution {
    pub condition: String,
    pub count: i64,
    pub total_value: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssetRoiResponse {
    pub asset_id: Uuid,
    pub asset_name: String,
    pub asset_code: String,
    pub purchase_price: Decimal,
    pub purchase_date: String,
    pub book_value: Decimal,
    pub accumulated_depreciation: Decimal,
    pub total_rental_revenue: Decimal,
    pub billing_count: i64,
    pub maintenance_cost: Decimal,
    pub parts_cost: Decimal,
    pub work_order_count: i64,
    pub net_profit: Decimal,
    pub roi_percentage: Decimal,
    pub utilization_days: i64,
}
