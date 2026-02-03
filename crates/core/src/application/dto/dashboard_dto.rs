use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DashboardStats {
    pub assets: AssetStats,
    pub maintenance: MaintenanceStats,
    pub loans: LoanStats,
    pub alerts: AlertStats,
    pub category_distribution: Vec<CategoryDistribution>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CategoryDistribution {
    pub category: String,
    pub count: i64,
    pub value: Decimal,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AssetStats {
    pub total: i64,
    pub by_status: Vec<StatusCount>,
    pub total_value: Decimal,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MaintenanceStats {
    pub pending: i64,
    pub overdue: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LoanStats {
    pub active: i64,
    pub overdue: i64,
    pub pending_approval: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlertStats {
    pub active: i64,
    pub critical: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}
