//! Fuel Service

use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::{FuelLog, FuelRequestType};
use crate::infrastructure::repositories::FuelRepository;

#[derive(Clone)]
pub struct FuelService {
    repo: FuelRepository,
}

impl FuelService {
    pub fn new(repo: FuelRepository) -> Self {
        Self { repo }
    }

    // Create new fuel request
    pub async fn request_fuel(
        &self,
        asset_id: Uuid,
        requested_by: Uuid,
        odometer_reading: Decimal,
        odometer_image_url: String,
        request_type: &str,
        requested_value: Decimal,
        driver_id: Option<Uuid>,
    ) -> Result<FuelLog, String> {
        // STRICT MODE: Check for previous uncompleted approved requests
        // Exception: If this is the FIRST request for this asset, we allow it.
        // But if history exists, we enforce the rule.

        let pending = self
            .repo
            .check_pending_request(asset_id)
            .await
            .map_err(|e| e.to_string())?;
        if let Some(prev) = pending {
            return Err(format!(
                "Strict Mode: Previous fuel request ({}) for this asset is not yet completed (Receipt Upload Pending). Please complete it first.",
                prev.tracking_number
            ));
        }

        let req_type = match request_type {
            "volume" => FuelRequestType::Volume,
            "amount" => FuelRequestType::Amount,
            _ => return Err("Invalid request type".to_string()),
        };

        let mut log = FuelLog::new(
            asset_id,
            requested_by,
            odometer_reading,
            odometer_image_url,
            &req_type,
            requested_value,
        );
        log.driver_id = driver_id.or(Some(requested_by));

        self.repo.create(&log).await.map_err(|e| e.to_string())
    }

    // List pending requests for approval
    pub async fn get_pending_requests(&self) -> Result<Vec<FuelLog>, String> {
        self.repo.list_pending().await.map_err(|e| e.to_string())
    }

    // List history
    pub async fn get_history(&self, limit: i64, offset: i64) -> Result<Vec<FuelLog>, String> {
        self.repo
            .list(limit, offset)
            .await
            .map_err(|e| e.to_string())
    }

    // Approve request -> Generate Coupon
    pub async fn approve_request(&self, id: Uuid, approved_by: Uuid) -> Result<String, String> {
        // Generate unique coupon code
        // Simple logic: FUEL-TIMESTAMP-RANDOM or just use tracking number variation but shorter
        let now = Utc::now();
        let coupon_code = format!(
            "CPN-{}-{}",
            now.format("%y%m"),
            &Uuid::new_v4().to_string()[..6].to_uppercase()
        );

        self.repo
            .approve(id, approved_by, &coupon_code)
            .await
            .map_err(|e| e.to_string())?;

        Ok(coupon_code)
    }

    // Reject request
    pub async fn reject_request(&self, id: Uuid, reason: &str) -> Result<bool, String> {
        self.repo
            .reject(id, reason)
            .await
            .map_err(|e| e.to_string())
    }

    // Complete transaction (Upload receipt)
    pub async fn complete_transaction(
        &self,
        id: Uuid,
        actual_filled_amount: Decimal,
        actual_volume: Option<Decimal>,
        receipt_image_url: &str,
    ) -> Result<bool, String> {
        self.repo
            .complete(id, actual_filled_amount, actual_volume, receipt_image_url)
            .await
            .map_err(|e| e.to_string())
    }
    // Get dashboard stats
    pub async fn get_dashboard_stats(&self) -> Result<Vec<(String, i64)>, String> {
        self.repo
            .get_dashboard_stats()
            .await
            .map_err(|e| e.to_string())
    }
    // List my requests
    pub async fn get_my_requests(&self, user_id: Uuid) -> Result<Vec<FuelLog>, String> {
        self.repo
            .list_by_user(user_id)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn get_analytics(
        &self,
    ) -> Result<crate::infrastructure::repositories::FuelAnalyticsData, String> {
        self.repo
            .get_fuel_analytics()
            .await
            .map_err(|e| e.to_string())
    }
}
