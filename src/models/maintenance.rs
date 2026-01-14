use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Maintenance type lookup
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MaintenanceType {
    pub id: i32,
    pub code: String,
    pub name: String,
    pub is_preventive: bool,
}

/// Maintenance record model
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,

    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,

    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,

    pub cost: Option<Decimal>,
    pub currency_id: Option<i32>,

    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,

    pub status: String,

    pub next_service_date: Option<NaiveDate>,
    pub odometer_reading: Option<i32>,

    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Maintenance for list view
#[derive(Debug, Serialize, FromRow)]
pub struct MaintenanceList {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,
    pub status: String,
    pub cost: Option<Decimal>,
}

/// Maintenance with joined data
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct MaintenanceDetail {
    #[serde(flatten)]
    pub record: MaintenanceRecord,
    pub asset_name: Option<String>,
    pub asset_code: Option<String>,
    pub maintenance_type_name: Option<String>,
    pub vendor_name: Option<String>,
}

/// Create maintenance request
#[derive(Debug, Deserialize)]
pub struct CreateMaintenanceRequest {
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,

    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,

    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,

    pub cost: Option<Decimal>,
    pub currency_id: Option<i32>,

    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,

    pub status: Option<String>,

    pub next_service_date: Option<NaiveDate>,
    pub odometer_reading: Option<i32>,
}

/// Update maintenance request
#[derive(Debug, Deserialize)]
pub struct UpdateMaintenanceRequest {
    pub maintenance_type_id: Option<i32>,

    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,

    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,

    pub cost: Option<Decimal>,
    pub currency_id: Option<i32>,

    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,

    pub status: Option<String>,

    pub next_service_date: Option<NaiveDate>,
    pub odometer_reading: Option<i32>,
}
