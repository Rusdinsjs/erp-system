use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceType {
    pub id: i32,
    pub code: String,
    pub name: String,
    pub is_preventive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<chrono::NaiveDate>,
    pub actual_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,
    pub cost: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub status: String,
    pub approval_status: String,
    pub cost_threshold_exceeded: bool,
    pub next_service_date: Option<chrono::NaiveDate>,
    pub odometer_reading: Option<i32>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joined fields (optional, might not always be present)
    #[sqlx(default)]
    pub asset_name: Option<String>,
    #[sqlx(default)]
    pub type_name: Option<String>,
}

impl MaintenanceRecord {
    pub fn new(asset_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            asset_id,
            maintenance_type_id: None,
            scheduled_date: None,
            actual_date: None,
            description: None,
            findings: None,
            actions_taken: None,
            cost: None,
            currency_id: None,
            performed_by: None,
            vendor_id: None,
            assigned_to: None,
            status: "planned".to_string(),
            approval_status: "not_required".to_string(),
            cost_threshold_exceeded: false,
            next_service_date: None,
            odometer_reading: None,
            created_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            asset_name: None,
            type_name: None,
        }
    }
}

// Summary struct for lists
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceSummary {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<chrono::NaiveDate>,
    pub actual_date: Option<chrono::NaiveDate>,
    pub status: String,
    pub cost: Option<Decimal>,

    #[sqlx(default)]
    pub asset_name: Option<String>,
    #[sqlx(default)]
    pub type_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceSchedule {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub interval_type: String, // 'time', 'usage'
    pub interval_value: i32,
    pub interval_unit: String, // 'days', 'months', 'km', 'hours'
    pub is_active: bool,
    pub last_run_date: Option<chrono::NaiveDate>,
    pub last_run_reading: Option<i32>,
    pub next_run_date: Option<chrono::NaiveDate>,
    pub next_run_reading: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joined fields
    #[sqlx(default)]
    pub asset_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaintenanceScheduleRequest {
    pub asset_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub interval_type: String,
    pub interval_value: i32,
    pub interval_unit: String,
    pub start_date: Option<chrono::NaiveDate>, // To calculate initial next_run_date
}

impl MaintenanceSchedule {
    pub fn calculate_next_run(
        &self,
        from_date: Option<chrono::NaiveDate>,
    ) -> Option<chrono::NaiveDate> {
        if self.interval_type != "time" {
            return None;
        }

        let base_date = from_date
            .or(self.last_run_date)
            .unwrap_or(Utc::now().naive_utc().date());

        match self.interval_unit.as_str() {
            "days" => Some(base_date + chrono::Duration::days(self.interval_value as i64)),
            "weeks" => Some(base_date + chrono::Duration::weeks(self.interval_value as i64)),
            "months" => {
                // Approximate months logic or use a crate date logic
                // For simplicity +30 days * value
                Some(base_date + chrono::Duration::days((self.interval_value * 30) as i64))
            }
            "years" => Some(base_date + chrono::Duration::days((self.interval_value * 365) as i64)),
            _ => None,
        }
    }
}
