//! Maintenance Service

use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

use crate::application::dto::{CreateMaintenanceRequest, UpdateMaintenanceRequest};
use crate::application::services::ApprovalService;
use crate::domain::entities::{MaintenanceRecord, MaintenanceSummary};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, MaintenanceRepository};

/// Cost threshold for approval (Rp 5.000.000)
const COST_APPROVAL_THRESHOLD: Decimal = Decimal::from_parts(5000000, 0, 0, false, 0);

/// Result of a maintenance operation
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum MaintenanceOperationResult {
    Success(MaintenanceRecord),
    PendingApproval(crate::infrastructure::repositories::approval_repository::ApprovalRequest),
}

#[derive(Clone)]
pub struct MaintenanceService {
    repository: MaintenanceRepository,
    asset_repository: AssetRepository,
    approval_service: ApprovalService,
}

impl MaintenanceService {
    pub fn new(
        repository: MaintenanceRepository,
        asset_repository: AssetRepository,
        approval_service: ApprovalService,
    ) -> Self {
        Self {
            repository,
            asset_repository,
            approval_service,
        }
    }

    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<MaintenanceSummary>> {
        let offset = (page - 1) * per_page;
        self.repository.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<MaintenanceSummary>> {
        self.repository.list_by_asset(asset_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_overdue(&self) -> DomainResult<Vec<MaintenanceSummary>> {
        self.repository
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<MaintenanceRecord> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("MaintenanceRecord", id))
    }

    pub async fn create(
        &self,
        request: CreateMaintenanceRequest,
        user_id: Uuid,
        role_level: i32,
    ) -> DomainResult<MaintenanceOperationResult> {
        let mut record = MaintenanceRecord::new(request.asset_id);
        record.maintenance_type_id = request.maintenance_type_id;
        record.scheduled_date = request.scheduled_date;
        record.description = request.description.clone();
        record.cost = request.cost;
        record.vendor_id = request.vendor_id;
        record.assigned_to = request.assigned_to;
        record.created_by = Some(user_id);

        // Check if cost exceeds threshold and user is not Manager/SuperAdmin
        let needs_approval = if let Some(cost) = request.cost {
            cost > COST_APPROVAL_THRESHOLD && role_level > 2
        } else {
            false
        };

        if needs_approval {
            record.approval_status = "pending_approval".to_string();
            record.cost_threshold_exceeded = true;

            // Create the record first (in pending state)
            let created = self.repository.create(&record).await.map_err(|e| {
                DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                }
            })?;

            // Create approval request
            let data_json = serde_json::to_value(&request).map_err(|e| {
                DomainError::validation("request_data", &format!("Failed to serialize: {}", e))
            })?;

            let approval_request = self
                .approval_service
                .create_request(
                    "WorkOrder",
                    created.id,
                    "HIGH_COST",
                    user_id,
                    Some(data_json),
                )
                .await?;

            return Ok(MaintenanceOperationResult::PendingApproval(
                approval_request,
            ));
        }

        let created = self.repository.create(&record).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(MaintenanceOperationResult::Success(created))
    }

    pub async fn update(
        &self,
        id: Uuid,
        request: UpdateMaintenanceRequest,
    ) -> DomainResult<MaintenanceRecord> {
        let mut record = self.get_by_id(id).await?;
        let old_status = record.status.clone();

        if let Some(t) = request.maintenance_type_id {
            record.maintenance_type_id = Some(t);
        }
        if let Some(d) = request.scheduled_date {
            record.scheduled_date = Some(d);
        }
        if let Some(d) = request.actual_date {
            record.actual_date = Some(d);
        }
        if let Some(d) = request.description {
            record.description = Some(d);
        }
        if let Some(f) = request.findings {
            record.findings = Some(f);
        }
        if let Some(a) = request.actions_taken {
            record.actions_taken = Some(a);
        }
        if let Some(c) = request.cost {
            record.cost = Some(c);
        }
        if let Some(p) = request.performed_by {
            record.performed_by = Some(p);
        }
        if let Some(v) = request.vendor_id {
            record.vendor_id = Some(v);
        }
        if let Some(a) = request.assigned_to {
            record.assigned_to = Some(a);
        }

        // Status & Next Service
        if let Some(s) = request.status.clone() {
            record.status = s;
        }
        if let Some(n) = request.next_service_date {
            record.next_service_date = Some(n);
        }

        // Odometer
        if let Some(odometer) = request.odometer_reading {
            record.odometer_reading = Some(odometer);
        }

        let updated = self.repository.update(&record).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Business Logic: Asset Status Sync
        if let Some(new_status) = request.status {
            if new_status == "in_progress" && old_status != "in_progress" {
                let _ = self
                    .asset_repository
                    .update_status(record.asset_id, "maintenance")
                    .await;
            } else if new_status == "completed" && old_status != "completed" {
                let _ = self
                    .asset_repository
                    .update_status(record.asset_id, "active")
                    .await;

                // Update Odometer if provided
                if let Some(odometer) = request.odometer_reading {
                    let _ = self
                        .asset_repository
                        .update_odometer(record.asset_id, odometer)
                        .await;
                }
            }
        }

        Ok(updated)
    }

    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Check upcoming maintenance (Background Task)
    pub async fn check_upcoming_maintenance(&self) -> DomainResult<()> {
        // Placeholder for background logic
        // Logic: Find maintenance with scheduled_date = tomorrow/today and send notification
        // For now just querying overdue to "touch" the repo
        let _ = self.repository.list_overdue().await;
        Ok(())
    }
}
