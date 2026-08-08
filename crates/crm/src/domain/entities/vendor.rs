//! Vendor Entity
//!
//! Vendor/Supplier management with performance scoring and contract tracking.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Vendor entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vendor {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,

    // Performance scoring
    pub performance_score: Option<Decimal>,
    pub rating: Option<i32>, // 1-5 stars

    // Contract info
    pub contract_start_date: Option<NaiveDate>,
    pub contract_end_date: Option<NaiveDate>,

    // SLA tracking
    pub sla_response_hours: Option<i32>,
    pub sla_resolution_hours: Option<i32>,

    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Vendor {
    pub fn new(code: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            code,
            name,
            contact_person: None,
            phone: None,
            email: None,
            address: None,
            website: None,
            performance_score: None,
            rating: None,
            contract_start_date: None,
            contract_end_date: None,
            sla_response_hours: None,
            sla_resolution_hours: None,
            is_active: true,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if vendor contract is active
    pub fn is_contract_active(&self) -> bool {
        match (self.contract_start_date, self.contract_end_date) {
            (Some(start), Some(end)) => {
                let today = Utc::now().date_naive();
                today >= start && today <= end
            }
            (Some(start), None) => {
                let today = Utc::now().date_naive();
                today >= start
            }
            _ => self.is_active,
        }
    }

    /// Calculate performance score based on metrics
    pub fn calculate_performance_score(
        on_time_deliveries: i32,
        total_deliveries: i32,
        quality_score: Decimal,
    ) -> Decimal {
        if total_deliveries == 0 {
            return Decimal::ZERO;
        }

        let delivery_rate =
            Decimal::from(on_time_deliveries * 100) / Decimal::from(total_deliveries);
        (delivery_rate + quality_score) / Decimal::from(2)
    }
}

/// Vendor summary for list views
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct VendorSummary {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub rating: Option<i32>,
    pub is_active: bool,
}
