use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MonthlyCost {
    pub month: String,
    pub maintenance_cost: Decimal,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetStatusStats {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExpenseAnalysis {
    pub month: chrono::NaiveDate,
    pub expense_type: String,
    pub total_amount: Decimal,
}
