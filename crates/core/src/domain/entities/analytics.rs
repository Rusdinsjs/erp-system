use rust_decimal::Decimal;
use serde::Serialize;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MonthlyCost {
    pub month: String,
    pub maintenance_cost: Decimal,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AssetStatusStats {
    pub status: String,
    pub count: i64,
}
