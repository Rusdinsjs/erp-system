//! Fuel Service

use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::{FuelLog, FuelRequestType};
use crate::infrastructure::repositories::FuelRepository;

#[derive(Debug, serde::Deserialize)]
pub struct FuelRequest {
    pub asset_id: Uuid,
    pub requested_by: Uuid,
    pub odometer_reading: Decimal,
    pub odometer_image_url: String,
    pub request_type: String,
    pub requested_value: Decimal,
    pub driver_id: Option<Uuid>,
}

use crate::application::services::JournalService;
use crate::domain::entities::journal::{CreateJournalEntryRequest, CreateJournalLineRequest};
use crate::domain::errors::DomainResult;

#[derive(Clone)]
pub struct FuelService {
    repo: FuelRepository,
    journal_service: JournalService,
}

impl FuelService {
    pub fn new(repo: FuelRepository, journal_service: JournalService) -> Self {
        Self {
            repo,
            journal_service,
        }
    }

    // Create new fuel request
    pub async fn request_fuel(&self, req: FuelRequest) -> DomainResult<FuelLog> {
        // STRICT MODE: Check for previous uncompleted approved requests
        // Exception: If this is the FIRST request for this asset, we allow it.
        // But if history exists, we enforce the rule.

        let pending = self
            .repo
            .check_pending_request(req.asset_id)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))?;
        if let Some(prev) = pending {
            return Err(crate::domain::errors::DomainError::business_rule(
                "Strict Mode",
                &format!(
                "Previous fuel request ({}) for this asset is not yet completed (Receipt Upload Pending). Please complete it first.",
                prev.tracking_number
            )));
        }

        let req_type = match req.request_type.as_str() {
            "volume" => FuelRequestType::Volume,
            "amount" => FuelRequestType::Amount,
            _ => {
                return Err(crate::domain::errors::DomainError::bad_request(
                    "Invalid request type",
                ))
            }
        };

        let mut log = FuelLog::new(
            req.asset_id,
            req.requested_by,
            req.odometer_reading,
            req.odometer_image_url,
            &req_type,
            req.requested_value,
        );
        log.driver_id = req.driver_id.or(Some(req.requested_by));

        self.repo
            .create(&log)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    // List pending requests for approval
    pub async fn get_pending_requests(&self) -> DomainResult<Vec<FuelLog>> {
        self.repo
            .list_pending()
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    // List history
    pub async fn get_history(&self, limit: i64, offset: i64) -> DomainResult<Vec<FuelLog>> {
        self.repo
            .list(limit, offset)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    // Approve request -> Generate Coupon
    pub async fn approve_request(&self, id: Uuid, approved_by: Uuid) -> DomainResult<String> {
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
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))?;

        Ok(coupon_code)
    }

    // Reject request
    pub async fn reject_request(&self, id: Uuid, reason: &str) -> DomainResult<bool> {
        self.repo
            .reject(id, reason)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    // Complete transaction (Upload receipt)
    pub async fn complete_transaction(
        &self,
        id: Uuid,
        actual_filled_amount: Decimal,
        actual_volume: Option<Decimal>,
        receipt_image_url: &str,
    ) -> DomainResult<bool> {
        let completed = self
            .repo
            .complete(id, actual_filled_amount, actual_volume, receipt_image_url)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))?;

        if completed {
            // AUTOMATIC JOURNAL ENTRY
            // Debit: Biaya Bahan Bakar (5-1140) -> 00000000-0000-4005-a114-000000000000
            // Credit: Hutang BBM (2-1130)       -> 00000000-0000-4002-a113-000000000000

            let expense_account_id =
                Uuid::parse_str("00000000-0000-4005-a114-000000000000").unwrap();
            let payable_account_id =
                Uuid::parse_str("00000000-0000-4002-a113-000000000000").unwrap();

            // Fetch log to get tracking number
            let log_opt = self.repo.find_by_id(id).await.unwrap_or(None);
            let description = if let Some(log) = log_opt {
                format!(
                    "Fuel Use {} - {}",
                    log.tracking_number,
                    log.asset_name.unwrap_or_default()
                )
            } else {
                "Fuel Usage".to_string()
            };

            let req = CreateJournalEntryRequest {
                date: Utc::now().date_naive(),
                description,
                reference: Some(id.to_string()),
                lines: vec![
                    CreateJournalLineRequest {
                        account_id: expense_account_id,
                        debit: actual_filled_amount,
                        credit: Decimal::ZERO,
                        description: Some("Biaya Bahan Bakar".to_string()),
                    },
                    CreateJournalLineRequest {
                        account_id: payable_account_id,
                        debit: Decimal::ZERO,
                        credit: actual_filled_amount,
                        description: Some("Hutang BBM".to_string()),
                    },
                ],
            };

            // Fire and forget? Or fail if journal fails?
            // Better to log error if fails but not fail the transaction since fuel is physically done.
            // But for data integrity, maybe we should await it.
            let _ = self
                .journal_service
                .create_entry(req, None)
                .await
                .map_err(|e| {
                    println!("Failed to create auto-journal for fuel: {:?}", e);
                    e
                });
        }

        Ok(completed)
    }

    // Get dashboard stats
    pub async fn get_dashboard_stats(&self) -> DomainResult<Vec<(String, i64)>> {
        self.repo
            .get_dashboard_stats()
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    // List my requests
    pub async fn get_my_requests(&self, user_id: Uuid) -> DomainResult<Vec<FuelLog>> {
        self.repo
            .list_by_user(user_id)
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }

    pub async fn get_analytics(
        &self,
    ) -> DomainResult<crate::infrastructure::repositories::FuelAnalyticsData> {
        self.repo
            .get_fuel_analytics()
            .await
            .map_err(|e| crate::domain::errors::DomainError::Database(e.to_string()))
    }
}
