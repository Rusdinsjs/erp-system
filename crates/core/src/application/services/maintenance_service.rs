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
#[allow(clippy::large_enum_variant)]
pub enum MaintenanceOperationResult {
    Success(MaintenanceRecord),
    PendingApproval(Box<crate::infrastructure::repositories::approval_repository::ApprovalRequest>),
}

#[derive(Clone)]
pub struct MaintenanceService {
    repository: MaintenanceRepository,
    asset_repository: AssetRepository,
    approval_service: ApprovalService,
    notification_service: crate::application::services::NotificationService,
}

impl MaintenanceService {
    pub fn new(
        repository: MaintenanceRepository,
        asset_repository: AssetRepository,
        approval_service: ApprovalService,
        notification_service: crate::application::services::NotificationService,
    ) -> Self {
        Self {
            repository,
            asset_repository,
            approval_service,
            notification_service,
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

            // Notify Admins about high cost maintenance
            let asset_name = self
                .asset_repository
                .find_by_id(request.asset_id)
                .await
                .ok()
                .flatten()
                .map(|a| a.name)
                .unwrap_or_else(|| "Unknown Asset".to_string());

            let _ = self
                .notification_service
                .notify_admins(
                    "maintenance_approval",
                    serde_json::json!({
                        "asset_name": asset_name,
                        "cost": request.cost.unwrap_or_default().to_string(),
                        "requester": user_id.to_string()
                    }),
                    Some("maintenance"),
                    Some(created.id),
                )
                .await;

            return Ok(MaintenanceOperationResult::PendingApproval(Box::new(
                approval_request,
            )));
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

        // Notify if technician assigned
        if let Some(technician_id) = request.assigned_to {
            let asset_name = self
                .asset_repository
                .find_by_id(record.asset_id)
                .await
                .ok()
                .flatten()
                .map(|a| a.name)
                .unwrap_or_else(|| "Unknown Asset".to_string());

            let _ = self
                .notification_service
                .create(
                    technician_id,
                    "Maintenance Assignment",
                    &format!("You have been assigned maintenance for {}", asset_name),
                    Some("maintenance"),
                    Some(record.id),
                )
                .await;
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

    /// Check and process upcoming maintenance
    pub async fn check_upcoming_maintenance(&self) -> DomainResult<Vec<MaintenanceRecord>> {
        self.repository.list_due_next_service().await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    // --- Schedule Methods ---

    pub async fn create_schedule(
        &self,
        request: crate::domain::entities::maintenance::CreateMaintenanceScheduleRequest,
    ) -> DomainResult<crate::domain::entities::maintenance::MaintenanceSchedule> {
        self.repository.create_schedule(request).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_schedules(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::maintenance::MaintenanceSchedule>> {
        // Note: Repository returns MaintenanceSchedule, but we might want to map to a summary or use the struct directly.
        // For simplicity reusing the struct or casting.
        // Actually repo returns MaintenanceSchedule.
        // Let's adjust return type to MaintenanceSchedule
        self.repository
            .list_schedules()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_schedules_raw(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::maintenance::MaintenanceSchedule>> {
        self.repository
            .list_schedules()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn run_schedule_now(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> DomainResult<MaintenanceRecord> {
        // 1. Fetch Schedule
        let schedule = self
            .repository
            .find_schedule_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("MaintenanceSchedule", id))?;

        // 2. Create Maintenance Record (Work Order)
        let record = MaintenanceRecord {
            id: Uuid::new_v4(),
            asset_id: schedule.asset_id,
            maintenance_type_id: None, // Optional, or derive from schedule if we add type to schedule
            scheduled_date: Some(chrono::Utc::now().naive_utc().date()),
            actual_date: None,
            description: Some(format!("Manual Run: {}", schedule.title)),
            findings: None,
            actions_taken: None,
            cost: None,
            currency_id: None,
            performed_by: None,
            vendor_id: None,
            assigned_to: None,
            status: "pending".to_string(),
            approval_status: "approved".to_string(), // Auto-approved for manual run? Or pending? Let's say pending assignment
            cost_threshold_exceeded: false,
            next_service_date: None,
            odometer_reading: None,
            created_by: Some(user_id),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            asset_name: None,
            type_name: None,
        };

        let created_record = self.repository.create(&record).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // 3. Update Schedule next run date
        let today = chrono::Utc::now().naive_utc().date();
        let next_run = if schedule.interval_type == "time" {
            match schedule.interval_unit.as_str() {
                "days" => Some(today + chrono::Duration::days(schedule.interval_value as i64)),
                "weeks" => Some(today + chrono::Duration::weeks(schedule.interval_value as i64)),
                "months" => {
                    Some(today + chrono::Duration::days((schedule.interval_value * 30) as i64))
                }
                "years" => {
                    Some(today + chrono::Duration::days((schedule.interval_value * 365) as i64))
                }
                _ => None,
            }
        } else {
            None // Usage based handled separately
        };

        if let Some(next_date) = next_run {
            let _ = self
                .repository
                .update_schedule_next_run(schedule.id, next_date, today)
                .await;
        }

        Ok(created_record)
    }
}
