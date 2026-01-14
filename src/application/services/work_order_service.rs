//! Work Order Service

use chrono::NaiveDate;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::{
    AssetState, ChecklistItem, WorkOrder, WorkOrderPart, WorkOrderStatus,
};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    AssetRepository, LifecycleRepository, WorkOrderRepository,
};

use crate::infrastructure::cache::{CacheKey, CacheOperations};
use std::sync::Arc;

/// Create work order request
#[derive(Debug, serde::Deserialize)]
pub struct CreateWorkOrderRequest {
    pub asset_id: Uuid,
    pub wo_type: String,
    pub priority: Option<String>,
    pub scheduled_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub problem_description: Option<String>,
    pub estimated_hours: Option<Decimal>,
    pub estimated_cost: Option<Decimal>,
    pub safety_requirements: Option<Vec<String>>,
    pub lockout_tagout_required: Option<bool>,
    pub location_id: Option<Uuid>,
}

#[derive(Clone)]
pub struct WorkOrderService {
    repository: WorkOrderRepository,
    lifecycle_repo: LifecycleRepository,
    asset_repo: AssetRepository,
    cache: Arc<dyn CacheOperations>,
}

impl WorkOrderService {
    pub fn new(
        repository: WorkOrderRepository,
        lifecycle_repo: LifecycleRepository,
        asset_repo: AssetRepository,
        cache: Arc<dyn CacheOperations>,
    ) -> Self {
        Self {
            repository,
            lifecycle_repo,
            asset_repo,
            cache,
        }
    }

    /// Get lifecycle target state based on WO type
    fn get_lifecycle_state_for_wo_type(wo_type: &str) -> Option<AssetState> {
        match wo_type.to_lowercase().as_str() {
            "maintenance" | "preventive" | "pm" => Some(AssetState::UnderMaintenance),
            "repair" | "corrective" | "cm" | "breakdown" => Some(AssetState::UnderRepair),
            _ => None,
        }
    }

    pub async fn create(
        &self,
        request: CreateWorkOrderRequest,
        created_by: Option<Uuid>,
    ) -> DomainResult<WorkOrder> {
        let mut wo = WorkOrder::new(request.asset_id, &request.wo_type);
        wo.priority = request.priority;
        wo.scheduled_date = request.scheduled_date;
        wo.due_date = request.due_date;
        wo.problem_description = request.problem_description;
        wo.estimated_hours = request.estimated_hours;
        wo.estimated_cost = request.estimated_cost;
        wo.safety_requirements = request.safety_requirements;
        wo.lockout_tagout_required = request.lockout_tagout_required.unwrap_or(false);
        wo.location_id = request.location_id;
        wo.created_by = created_by;

        self.repository
            .create(&wo)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("WorkOrder", id))
    }

    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<WorkOrder>> {
        let offset = (page - 1) * per_page;
        self.repository.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<WorkOrder>> {
        self.repository.list_by_asset(asset_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_pending(&self) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_pending()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_overdue(&self) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_by_technician(&self, technician_id: Uuid) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_by_technician(technician_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn approve(&self, id: Uuid, _approved_by: Uuid) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        if wo.status != WorkOrderStatus::Pending.as_str() {
            return Err(DomainError::business_rule(
                "work_order_status",
                "Can only approve pending work orders",
            ));
        }

        self.repository
            .update_status(id, "approved")
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    pub async fn assign(&self, id: Uuid, technician_id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .assign_technician(id, technician_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    /// Start work on a work order - also transitions asset lifecycle
    pub async fn start_work(&self, id: Uuid) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        // Update WO status
        self.repository
            .start_work(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Transition asset lifecycle based on WO type
        if let Some(target_state) = Self::get_lifecycle_state_for_wo_type(&wo.wo_type) {
            // Get current asset status
            if let Ok(current_status) = self.lifecycle_repo.get_asset_status(wo.asset_id).await {
                let current_state =
                    AssetState::from_str(&current_status).unwrap_or(AssetState::Deployed);

                // Only transition if the target state is valid
                if current_state.can_transition_to(&target_state) {
                    // Update asset status
                    let _ = self
                        .lifecycle_repo
                        .update_asset_status(wo.asset_id, target_state.as_str())
                        .await;

                    // Update asset location if WO has one
                    if let Some(loc_id) = wo.location_id {
                        let _ = self.asset_repo.update_location(wo.asset_id, loc_id).await;
                    }

                    // Record in history
                    let _ = self
                        .lifecycle_repo
                        .record_transition(
                            wo.asset_id,
                            &current_state,
                            &target_state,
                            Some(format!("Work Order {} started", wo.wo_number)),
                            wo.assigned_technician,
                            None,
                        )
                        .await;

                    // Invalidate asset cache
                    let _ = self.cache.delete(&CacheKey::asset(&wo.asset_id)).await;
                }
            }
        }

        self.get_by_id(id).await
    }

    /// Complete work order - transitions asset back to deployed
    pub async fn complete(
        &self,
        id: Uuid,
        completed_by: Uuid,
        work_performed: &str,
        actual_cost: Option<Decimal>,
    ) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        // Complete WO in database
        self.repository
            .complete(id, completed_by, work_performed, actual_cost)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Transition asset back to deployed
        if let Ok(current_status) = self.lifecycle_repo.get_asset_status(wo.asset_id).await {
            let current_state =
                AssetState::from_str(&current_status).unwrap_or(AssetState::Deployed);

            // Only transition if currently under maintenance/repair
            if matches!(
                current_state,
                AssetState::UnderMaintenance | AssetState::UnderRepair
            ) {
                let target_state = AssetState::Deployed;

                if current_state.can_transition_to(&target_state) {
                    // Update asset status
                    if let Err(e) = self
                        .lifecycle_repo
                        .update_asset_status(wo.asset_id, target_state.as_str())
                        .await
                    {
                        println!("ERROR: Failed to update asset status: {:?}", e);
                    }

                    // Record in history
                    let _ = self
                        .lifecycle_repo
                        .record_transition(
                            wo.asset_id,
                            &current_state,
                            &target_state,
                            Some(format!(
                                "Work Order {} completed: {}",
                                wo.wo_number, work_performed
                            )),
                            Some(completed_by),
                            None,
                        )
                        .await;

                    // Invalidate asset cache
                    let _ = self.cache.delete(&CacheKey::asset(&wo.asset_id)).await;
                }
            }
        }

        self.get_by_id(id).await
    }

    // Checklist methods
    pub async fn get_checklist(&self, work_order_id: Uuid) -> DomainResult<Vec<ChecklistItem>> {
        self.repository
            .get_checklists(work_order_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn add_checklist_item(
        &self,
        work_order_id: Uuid,
        task_number: i32,
        description: String,
    ) -> DomainResult<ChecklistItem> {
        let item = ChecklistItem::new(work_order_id, task_number, description);
        self.repository
            .add_checklist_item(&item)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn complete_checklist_item(
        &self,
        id: Uuid,
        completed_by: Uuid,
        result: &str,
    ) -> DomainResult<bool> {
        self.repository
            .complete_checklist_item(id, completed_by, result)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn remove_checklist_item(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .remove_checklist_item(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    // Parts methods
    pub async fn get_parts(&self, work_order_id: Uuid) -> DomainResult<Vec<WorkOrderPart>> {
        self.repository.get_parts(work_order_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn add_part(
        &self,
        work_order_id: Uuid,
        part_name: String,
        quantity: Decimal,
        unit_cost: Decimal,
    ) -> DomainResult<WorkOrderPart> {
        let part = WorkOrderPart::new(work_order_id, &part_name, quantity, unit_cost);

        let created = self.repository.add_part(&part).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Recalculate cost
        let _ = self.repository.update_parts_cost(work_order_id).await;

        Ok(created)
    }

    pub async fn remove_part(&self, id: Uuid, work_order_id: Uuid) -> DomainResult<bool> {
        let result = self.repository.remove_part(id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Recalculate cost
        let _ = self.repository.update_parts_cost(work_order_id).await;

        Ok(result)
    }
}
