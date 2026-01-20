//! Rental Contract Entity
//!
//! Contract management for rental agreements with lifecycle tracking

use chrono::{DateTime, NaiveDate, Utc};

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Contract status lifecycle
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractStatus {
    Draft,
    PendingApproval,
    Active,
    Expiring,
    Expired,
    Renewed,
    Terminated,
}

impl ContractStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::PendingApproval => "pending_approval",
            Self::Active => "active",
            Self::Expiring => "expiring",
            Self::Expired => "expired",
            Self::Renewed => "renewed",
            Self::Terminated => "terminated",
        }
    }
}

/// Rental Contract Entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalContract {
    pub id: Uuid,
    pub contract_number: String,
    pub client_id: Uuid,

    // Contract period
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,

    // Terms
    pub auto_renew: Option<bool>,
    pub renewal_notice_days: Option<i32>,
    pub payment_terms: Option<String>,
    pub price_lock: Option<bool>,

    // Status
    pub status: String,

    // NOTE: KPI fields exist in table but not used here
    // KPIs are tracked per billing period, not per contract
    // Contract performance = sum of all billing periods

    // Documents
    pub contract_file_url: Option<String>,
    pub notes: Option<String>,

    // Audit
    pub created_at: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub updated_at: Option<DateTime<Utc>>,
    pub updated_by: Option<Uuid>,

    pub approved_at: Option<DateTime<Utc>>,
    pub approved_by: Option<Uuid>,

    pub terminated_at: Option<DateTime<Utc>>,
    pub terminated_by: Option<Uuid>,
    pub termination_reason: Option<String>,
}

impl RentalContract {
    /// Check if contract is expiring soon (within renewal notice period)
    pub fn is_expiring_soon(&self) -> bool {
        let today = Utc::now().naive_utc().date();
        let days = self.renewal_notice_days.unwrap_or(30) as i64;
        let notice_date = self.end_date - chrono::Duration::days(days);
        today >= notice_date && today < self.end_date
    }

    /// Check if contract is expired
    pub fn is_expired(&self) -> bool {
        let today = Utc::now().naive_utc().date();
        today > self.end_date
    }

    /// Check if contract is active (within date range and status is active)
    pub fn is_active(&self) -> bool {
        let today = Utc::now().naive_utc().date();
        self.status == "active" && today >= self.start_date && today <= self.end_date
    }

    /// Get days remaining
    pub fn days_remaining(&self) -> i64 {
        let today = Utc::now().naive_utc().date();
        (self.end_date - today).num_days()
    }

    /// Auto-generate contract number
    /// Format: CTR-{CLIENT_CODE}-{YEAR}-{SEQUENCE}
    /// Example: CTR-ABC-2026-0001
    pub fn generate_contract_number(client_code: &str, year: i32, sequence: i32) -> String {
        format!("CTR-{}-{}-{:04}", client_code, year, sequence)
    }
}
