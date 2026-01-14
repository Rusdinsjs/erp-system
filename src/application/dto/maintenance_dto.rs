use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize)]
pub struct CreateMaintenanceRequest {
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
    pub cost: Option<Decimal>,
    pub vendor_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>, // Technician assignment
}

#[derive(Deserialize)]
pub struct UpdateMaintenanceRequest {
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<chrono::NaiveDate>,
    pub actual_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,
    pub cost: Option<Decimal>,
    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub status: Option<String>,
    pub next_service_date: Option<chrono::NaiveDate>,
    pub odometer_reading: Option<i32>,
}

#[derive(Deserialize)]
pub struct MaintenanceSearchParams {
    pub asset_id: Option<Uuid>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: i64,
    pub per_page: i64,
}
