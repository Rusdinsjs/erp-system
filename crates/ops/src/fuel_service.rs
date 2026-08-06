//! Fuel Service

use async_trait::async_trait;
use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use management_system_core::application::services::approval_service::ModuleApprovalCallback;
use management_system_core::domain::entities::{FuelLog, FuelRequestType};
use management_system_core::domain::errors::DomainResult;
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::repositories::{FuelAnalyticsData, FuelRepository};

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

#[derive(Clone)]
pub struct FuelService {
    repo: FuelRepository,
    event_bus: EventBus,
}

impl FuelService {
    pub fn new(repo: FuelRepository, event_bus: EventBus) -> Self {
        Self { repo, event_bus }
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
            .map_err(|e| {
                management_system_core::domain::errors::DomainError::Database(e.to_string())
            })?;
        if let Some(prev) = pending {
            return Err(management_system_core::domain::errors::DomainError::business_rule(
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
                return Err(
                    management_system_core::domain::errors::DomainError::bad_request(
                        "Invalid request type",
                    ),
                )
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

        self.repo.create(&log).await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
    }

    // List pending requests for approval
    pub async fn get_pending_requests(&self) -> DomainResult<Vec<FuelLog>> {
        self.repo.list_pending().await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
    }

    // List history
    pub async fn get_history(&self, limit: i64, offset: i64) -> DomainResult<Vec<FuelLog>> {
        self.repo.list(limit, offset).await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
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
            .map_err(|e| {
                management_system_core::domain::errors::DomainError::Database(e.to_string())
            })?;

        Ok(coupon_code)
    }

    // Reject request
    pub async fn reject_request(&self, id: Uuid, reason: &str) -> DomainResult<bool> {
        self.repo.reject(id, reason).await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
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
            .map_err(|e| {
                management_system_core::domain::errors::DomainError::Database(e.to_string())
            })?;

        if completed {
            // Fetch full log for event
            if let Ok(Some(log)) = self.repo.find_by_id(id).await {
                // Publish Event for Finance (Automated Journal & Asset Expense)
                let _ = self.event_bus.publish(
                    management_system_core::domain::events::SystemEvent::FuelLogCreated(log),
                );
            }
        }

        Ok(completed)
    }

    // Get dashboard stats
    pub async fn get_dashboard_stats(&self) -> DomainResult<Vec<(String, i64)>> {
        self.repo.get_dashboard_stats().await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
    }

    // List my requests
    pub async fn get_my_requests(&self, user_id: Uuid) -> DomainResult<Vec<FuelLog>> {
        self.repo.list_by_user(user_id).await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
    }

    pub async fn get_analytics(&self) -> DomainResult<FuelAnalyticsData> {
        self.repo.get_fuel_analytics().await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })
    }
}

/// ModuleApprovalCallback implementation for FuelService
#[async_trait]
impl ModuleApprovalCallback for FuelService {
    async fn on_final_approval(
        &self,
        request: &management_system_core::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<()> {
        let fuel_log_id = request.resource_id;

        // Generate unique coupon code
        let now = Utc::now();
        let coupon_code = format!(
            "CPN-{}-{}",
            now.format("%y%m"),
            &Uuid::new_v4().to_string()[..6].to_uppercase()
        );

        self.repo
            .approve(fuel_log_id, approver_id, &coupon_code)
            .await
            .map_err(|e| {
                management_system_core::domain::errors::DomainError::Database(e.to_string())
            })?;

        Ok(())
    }

    async fn on_rejection(
        &self,
        request: &management_system_core::infrastructure::repositories::ApprovalRequest,
        _approver_id: Uuid,
        notes: String,
    ) -> DomainResult<()> {
        let fuel_log_id = request.resource_id;

        self.repo.reject(fuel_log_id, &notes).await.map_err(|e| {
            management_system_core::domain::errors::DomainError::Database(e.to_string())
        })?;

        Ok(())
    }

    fn module_name(&self) -> &'static str {
        "fuel_request"
    }
}
