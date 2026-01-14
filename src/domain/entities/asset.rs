//! Asset Entity
//!
//! Core asset entity representing physical or logical assets in the system.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

use super::AssetState;

/// Asset model - full representation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Asset {
    pub id: Uuid,
    pub asset_code: String,
    pub name: String,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub assigned_to: Option<Uuid>,
    pub vendor_id: Option<Uuid>,

    // Classification
    pub is_rental: bool,
    pub asset_class: Option<String>,
    pub status: String,
    pub condition_id: Option<i32>,

    // Identity details
    pub serial_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub year_manufacture: Option<i32>,

    // Dynamic specifications (based on category)
    pub specifications: Option<JsonValue>,

    // Financial data
    pub purchase_date: Option<NaiveDate>,
    pub purchase_price: Option<Decimal>,
    pub currency_id: Option<i32>,
    pub unit_id: Option<i32>,
    pub quantity: Option<i32>,

    // Depreciation
    pub residual_value: Option<Decimal>,
    pub useful_life_months: Option<i32>,

    // QR Code
    pub qr_code_url: Option<String>,

    // Notes
    pub notes: Option<String>,

    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Asset {
    /// Create a new asset with required fields
    pub fn new(asset_code: String, name: String, category_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            asset_code,
            name,
            category_id,
            location_id: None,
            department: None,
            department_id: None,
            assigned_to: None,
            vendor_id: None,
            is_rental: false,
            asset_class: None,
            status: AssetState::Planning.as_str().to_string(),
            condition_id: None,
            serial_number: None,
            brand: None,
            model: None,
            year_manufacture: None,
            specifications: None,
            purchase_date: None,
            purchase_price: None,
            currency_id: None,
            unit_id: None,
            quantity: Some(1),
            residual_value: None,
            useful_life_months: None,
            qr_code_url: None,
            notes: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if asset is available for loan
    pub fn is_available(&self) -> bool {
        self.status == "available" || self.status == "in_inventory"
    }

    /// Check if asset can be assigned
    pub fn can_assign(&self) -> bool {
        self.status != "disposed" && self.status != "lost_stolen"
    }

    /// Calculate current book value based on depreciation
    pub fn calculate_book_value(&self) -> Option<Decimal> {
        let purchase_price = self.purchase_price?;
        let useful_life_months = self.useful_life_months? as i64;
        let residual_value = self.residual_value.unwrap_or(Decimal::ZERO);
        let purchase_date = self.purchase_date?;

        let months_elapsed = (Utc::now().date_naive() - purchase_date).num_days() / 30;

        if months_elapsed >= useful_life_months {
            return Some(residual_value);
        }

        let depreciation_per_month =
            (purchase_price - residual_value) / Decimal::from(useful_life_months);
        let total_depreciation = depreciation_per_month * Decimal::from(months_elapsed);

        Some(purchase_price - total_depreciation)
    }
}

/// Asset for list view (simplified)
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AssetSummary {
    pub id: Uuid,
    pub asset_code: String,
    pub name: String,
    pub status: String,
    pub asset_class: Option<String>,
    pub brand: Option<String>,
    pub purchase_price: Option<Decimal>,
    pub category_id: Uuid,
    pub location_id: Option<Uuid>,
    pub location_name: Option<String>,
    pub department: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
}

/// Asset with joined data for detail view
#[derive(Debug, Clone, Serialize)]
pub struct AssetDetail {
    #[serde(flatten)]
    pub asset: Asset,
    pub category_name: Option<String>,
    pub location_name: Option<String>,
    pub department_name: Option<String>,
    pub assigned_to_name: Option<String>,
    pub vendor_name: Option<String>,
    pub condition_name: Option<String>,
    pub vehicle_details: Option<super::asset_details::VehicleDetails>,
}

/// Asset history entry for tracking changes
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssetHistory {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub action: String,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_user_id: Option<Uuid>,
    pub to_user_id: Option<Uuid>,
    pub notes: Option<String>,
    pub performed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl AssetHistory {
    /// Create a new history entry
    pub fn new(asset_id: Uuid, action: &str, performed_by: Option<Uuid>) -> Self {
        Self {
            id: Uuid::new_v4(),
            asset_id,
            action: action.to_string(),
            from_location_id: None,
            to_location_id: None,
            from_user_id: None,
            to_user_id: None,
            notes: None,
            performed_by,
            created_at: Utc::now(),
        }
    }

    /// Create a transfer history entry
    pub fn transfer(
        asset_id: Uuid,
        from_location: Option<Uuid>,
        to_location: Option<Uuid>,
        performed_by: Option<Uuid>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            asset_id,
            action: "transferred".to_string(),
            from_location_id: from_location,
            to_location_id: to_location,
            from_user_id: None,
            to_user_id: None,
            notes: None,
            performed_by,
            created_at: Utc::now(),
        }
    }
}
