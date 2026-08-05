//! Work Order Service

use async_trait::async_trait;
use chrono::NaiveDate;
use rust_decimal::Decimal;
use uuid::Uuid;

use management_system_core::infrastructure::repositories::{
    AssetRepository, LifecycleRepository, MaintenanceTemplateRepository, WorkOrderAnalyticsData, WorkOrderRepository,
};
use management_system_core::application::dto::asset_expense_dto::{
    CreateAssetExpenseItemRequest, CreateAssetExpenseRequest,
};
use management_system_core::application::services::approval_service::ModuleApprovalCallback;
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::cache::{CacheKey, CacheOperations};
use management_system_core::domain::entities::{
    AssetState, ChecklistItem, WorkOrder, WorkOrderPart, WorkOrderStatus,
};

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
    pub target_category_id: Option<Uuid>,
    pub target_specifications: Option<serde_json::Value>,
    pub conversion_notes: Option<String>,
    pub conversion_type: Option<String>,
    pub assigned_technician: Option<Uuid>,
}

#[derive(Clone)]
pub struct WorkOrderService {
    repository: WorkOrderRepository,
    lifecycle_repo: LifecycleRepository,
    asset_repo: AssetRepository,
    cache: Arc<dyn CacheOperations>,
    notification_service: management_system_core::application::services::NotificationService,
    asset_expense_service: management_system_finance::AssetExpenseService,
    maintenance_template_repo: MaintenanceTemplateRepository,
    inventory_service: crate::InventoryService,
    event_bus: EventBus,
}

impl WorkOrderService {
    pub fn new(
        repository: WorkOrderRepository,
        lifecycle_repo: LifecycleRepository,
        asset_repo: AssetRepository,
        cache: Arc<dyn CacheOperations>,
        notification_service: management_system_core::application::services::NotificationService,
        asset_expense_service: management_system_finance::AssetExpenseService,
        maintenance_template_repo: MaintenanceTemplateRepository,
        inventory_service: crate::InventoryService,
        event_bus: EventBus,
    ) -> Self {
        Self {
            repository,
            lifecycle_repo,
            asset_repo,
            cache,
            notification_service,
            asset_expense_service,
            maintenance_template_repo,
            inventory_service,
            event_bus,
        }
    }

    /// Get lifecycle target state based on WO type
    fn get_lifecycle_state_for_wo_type(wo_type: &str) -> Option<AssetState> {
        match wo_type.to_lowercase().as_str() {
            "maintenance" | "preventive" | "pm" => Some(AssetState::UnderMaintenance),
            "repair" | "corrective" | "cm" | "breakdown" => Some(AssetState::UnderRepair),
            "conversion" | "upgrade" => Some(AssetState::UnderConversion),
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
        wo.target_category_id = request.target_category_id;
        wo.target_specifications = request.target_specifications;
        wo.conversion_notes = request.conversion_notes;
        wo.conversion_type = request.conversion_type;
        wo.assigned_technician = request.assigned_technician;

        if request.assigned_technician.is_some() {
            wo.status = "assigned".to_string();
        }

        let created =
            self.repository
                .create(&wo)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_CREATED", serde_json::json!(created))
            .await;

        Ok(created)
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

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_UPDATED", serde_json::json!(updated))
            .await;

        Ok(updated)
    }

    pub async fn assign(&self, id: Uuid, technician_id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .assign_technician(id, technician_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let updated_wo = self.get_by_id(id).await?;

        // Notify Technician
        let asset = self
            .asset_repo
            .find_by_id(updated_wo.asset_id)
            .await
            .ok()
            .flatten();
        let asset_name = asset
            .map(|a| a.name)
            .unwrap_or_else(|| "Unknown Asset".to_string());

        let _ = self
            .notification_service
            .notify_work_order_assigned(
                technician_id,
                &updated_wo.wo_number,
                &asset_name,
                updated_wo.id,
            )
            .await;

        Ok(updated_wo)
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

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_STATUS_CHANGED", serde_json::json!(updated))
            .await;

        Ok(updated)
    }

    /// Complete work order - transitions asset back to deployed
    pub async fn complete(
        &self,
        id: Uuid,
        completed_by: Uuid,
        work_performed: &str,
    ) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        // Complete WO in database
        self.repository
            .complete(id, completed_by, work_performed)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Transition asset back to deployed
        if let Ok(current_status) = self.lifecycle_repo.get_asset_status(wo.asset_id).await {
            let current_state =
                AssetState::from_str(&current_status).unwrap_or(AssetState::Deployed);

            // Handle CONVERSION logic: Update asset category and specs
            if wo.wo_type.to_lowercase() == "conversion" {
                if let Some(target_cat) = wo.target_category_id {
                    let _ = self
                        .asset_repo
                        .update_category(wo.asset_id, target_cat)
                        .await;
                }
                if let Some(target_specs) = wo.target_specifications {
                    let _ = self
                        .asset_repo
                        .update_specifications(wo.asset_id, target_specs)
                        .await;
                }
            }

            // Only transition if currently under maintenance/repair/conversion
            let is_in_maintenance_state = matches!(
                current_state,
                AssetState::UnderMaintenance
                    | AssetState::UnderRepair
                    | AssetState::UnderConversion
            );

            if is_in_maintenance_state {
                // Fetch asset to check assignment status
                let target_state =
                    if let Ok(Some(asset)) = self.asset_repo.find_by_id(wo.asset_id).await {
                        if asset.assigned_to.is_some() {
                            AssetState::Deployed
                        } else {
                            AssetState::InInventory
                        }
                    } else {
                        AssetState::Deployed // Fallback if asset fetch fails
                    };

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

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_COMPLETED", serde_json::json!(updated))
            .await;

        Ok(updated)
    }

    pub async fn verify(
        &self,
        id: Uuid,
        verified_by: Uuid,
        labor_cost: Decimal,
    ) -> DomainResult<WorkOrder> {
        self.repository
            .verify(id, verified_by, labor_cost)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_VERIFIED", serde_json::json!(updated))
            .await;

        Ok(updated)
    }

    pub async fn finalize_completion(
        &self,
        id: Uuid,
        reviewer_id: Uuid,
        labor_expense_type: String,
        parts_overrides: Option<Vec<(Uuid, String)>>,
    ) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        if wo.status != "verified" {
            return Err(DomainError::business_rule(
                "work_order_status",
                "Work Order must be in 'verified' status to finalize",
            ));
        }

        // 0. Apply Overrides if any
        if let Some(overrides) = parts_overrides {
            for (part_id, exp_type) in overrides {
                self.repository
                    .set_part_expense_type(part_id, &exp_type)
                    .await
                    .map_err(|e| DomainError::ExternalServiceError {
                        service: "database".to_string(),
                        message: e.to_string(),
                    })?;
            }
        }

        // 1. Group items by Expense Type
        let mut opex_items = Vec::new();
        let mut capex_items = Vec::new();

        // Parts
        let parts = self.get_parts(id).await?;
        for part in parts {
            let item = CreateAssetExpenseItemRequest {
                description: format!("Part: {}", part.part_name),
                amount: part.total_cost,
            };

            if part.expense_type == "CAPEX" {
                capex_items.push(item);
            } else {
                opex_items.push(item);
            }

            // AUTO-INVENTORY: Process Usage if linked to Inventory Item
            if let Some(item_id) = part.inventory_item_id {
                // Determine target asset account if CAPEX
                let mut target_account_id = None;
                if part.expense_type == "CAPEX" {
                    // Try to fetch the Asset's Control Account
                    if let Ok(Some(acc_id)) =
                        self.asset_repo.get_asset_account_id(wo.asset_id).await
                    {
                        target_account_id = Some(acc_id);
                    } else {
                        println!(
                            "WARNING: CAPEX part used but no Asset Account mapped for Asset {}",
                            wo.asset_id
                        );
                    }
                }

                let _ = self
                    .inventory_service
                    .process_usage(
                        item_id,
                        part.quantity,
                        wo.id,
                        wo.wo_number.clone(),
                        reviewer_id,
                        Some(part.expense_type.clone()),
                        target_account_id,
                    )
                    .await
                    .map_err(|e| println!("ERROR processing inventory usage: {:?}", e));
            }
        }

        // Labor (assigned to the main expense_type selected by Signer)
        if let Some(labor) = wo.labor_cost {
            if labor > rust_decimal::Decimal::ZERO {
                let item = CreateAssetExpenseItemRequest {
                    description: "Labor Cost".to_string(),
                    amount: labor,
                };
                if labor_expense_type == "CAPEX" {
                    capex_items.push(item);
                } else {
                    opex_items.push(item);
                }
            }
        }

        // 2. Create Expenses
        let mut opex_id = None;
        let mut capex_id = None;
        let invoice_num = wo.wo_number.clone();

        // Create OPEX Expense if items exist
        if !opex_items.is_empty() {
            let expense_req = CreateAssetExpenseRequest {
                description: format!("WO-{}: {} (OPEX)", wo.wo_number, wo.wo_type),
                items: opex_items,
                date: chrono::Utc::now().date_naive(),
                vendor_name: None,
                invoice_number: Some(format!("{}-OPEX", invoice_num)),
                proof_url: None,
                expense_type: Some("OPEX".to_string()),
            };
            let expense = self
                .asset_expense_service
                .create(wo.asset_id, expense_req, reviewer_id)
                .await?;
            opex_id = Some(expense.id);
        }

        // Create CAPEX Expense if items exist
        if !capex_items.is_empty() {
            let expense_req = CreateAssetExpenseRequest {
                description: format!("WO-{}: {} (CAPEX)", wo.wo_number, wo.wo_type),
                items: capex_items,
                date: chrono::Utc::now().date_naive(),
                vendor_name: None,
                invoice_number: Some(format!("{}-CAPEX", invoice_num)),
                proof_url: None,
                expense_type: Some("CAPEX".to_string()),
            };
            let expense = self
                .asset_expense_service
                .create(wo.asset_id, expense_req, reviewer_id)
                .await?;
            capex_id = Some(expense.id);
        }

        // 3. Update Work Order
        self.repository
            .set_expense_info(id, &labor_expense_type, opex_id, capex_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 4. Update Status to Completed
        self.repository
            .update_status(id, "completed")
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let updated = self.get_by_id(id).await?;

        // Labor Journaling (Internal Allocation)
        // MOVED TO FinanceService via EventBus
        let _ = self.event_bus.publish(
            management_system_core::domain::events::SystemEvent::WorkOrderFinalized(
                updated.clone(),
            ),
        );

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_COMPLETED", serde_json::json!(updated))
            .await;

        Ok(updated)
    }

    pub async fn submit_signoff(
        &self,
        id: Uuid,
        role: String,
        signature_url: String,
    ) -> DomainResult<WorkOrder> {
        self.repository
            .update_signoff(id, &role, &signature_url)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let updated = self.get_by_id(id).await?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast(
                "WORK_ORDER_SIGNED",
                serde_json::json!({
                    "id": id,
                    "role": role,
                    "signature_url": signature_url,
                }),
            )
            .await;

        Ok(updated)
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
        let created = self
            .repository
            .add_checklist_item(&item)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("CHECKLIST_ITEM_ADDED", serde_json::json!(created))
            .await;

        Ok(created)
    }

    pub async fn update_checklist_item(&self, id: Uuid, description: String) -> DomainResult<bool> {
        let success = self
            .repository
            .update_checklist_item(id, &description)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if success {
            // Real-time broadcast
            let _ = self
                .notification_service
                .broadcast(
                    "CHECKLIST_ITEM_UPDATED",
                    serde_json::json!({
                        "id": id,
                        "description": description,
                    }),
                )
                .await;
        }

        Ok(success)
    }

    pub async fn update_checklist_photos(
        &self,
        id: Uuid,
        photos: Vec<String>,
    ) -> DomainResult<bool> {
        let success = self
            .repository
            .update_checklist_photos(id, &photos)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if success {
            let _ = self
                .notification_service
                .broadcast(
                    "CHECKLIST_PHOTOS_UPDATED",
                    serde_json::json!({
                        "id": id,
                        "photos": photos,
                    }),
                )
                .await;
        }

        Ok(success)
    }

    pub async fn complete_checklist_item(
        &self,
        id: Uuid,
        completed_by: Uuid,
        result: &str,
    ) -> DomainResult<bool> {
        let success = self
            .repository
            .complete_checklist_item(id, completed_by, result)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if success {
            // Real-time broadcast for progress tracking
            let _ = self
                .notification_service
                .broadcast(
                    "CHECKLIST_UPDATED",
                    serde_json::json!({
                        "checklist_id": id,
                        "work_order_id": id, // Usually progress is tracked by WO
                        "completed_by": completed_by,
                        "status": "completed"
                    }),
                )
                .await;
        }

        Ok(success)
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
        expense_type: Option<String>,
        inventory_item_id: Option<Uuid>,
    ) -> DomainResult<WorkOrderPart> {
        let part = WorkOrderPart::new(
            work_order_id,
            &part_name,
            quantity,
            unit_cost,
            expense_type,
            inventory_item_id,
        );

        let created = self.repository.add_part(&part).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Recalculate cost
        let _ = self.repository.update_parts_cost(work_order_id).await;

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_PART_ADDED", serde_json::json!(created))
            .await;

        Ok(created)
    }

    pub async fn update_part(
        &self,
        work_order_id: Uuid,
        part_id: Uuid,
        part_name: String,
        quantity: Decimal,
        unit_cost: Decimal,
        expense_type: Option<String>,
        inventory_item_id: Option<Uuid>,
    ) -> DomainResult<WorkOrderPart> {
        let mut part = WorkOrderPart::new(
            work_order_id,
            &part_name,
            quantity,
            unit_cost,
            expense_type,
            inventory_item_id,
        );
        part.id = part_id; // Keep original ID

        let updated = self.repository.update_part(&part).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Update WO totals
        let _ = self.repository.update_parts_cost(work_order_id).await;

        Ok(updated)
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

        let _ = self
            .notification_service
            .broadcast(
                "WORK_ORDER_PART_REMOVED",
                serde_json::json!({ "id": id, "work_order_id": work_order_id }),
            )
            .await;

        Ok(result)
    }

    pub async fn get_analytics(&self) -> DomainResult<WorkOrderAnalyticsData> {
        self.repository
            .get_analytics()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn apply_template(
        &self,
        work_order_id: Uuid,
        template_id: Uuid,
    ) -> DomainResult<usize> {
        let tasks = self
            .maintenance_template_repo
            .get_tasks(template_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let mut count = 0;
        for task in tasks {
            let item = ChecklistItem::new(work_order_id, task.task_number, task.description);
            self.repository
                .add_checklist_item(&item)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
            count += 1;
        }

        // Real-time broadcast
        let _ = self
            .notification_service
            .broadcast(
                "CHECKLIST_UPDATED",
                serde_json::json!({ "work_order_id": work_order_id }),
            )
            .await;

        // Increment template usage statistics
        let _ = self
            .maintenance_template_repo
            .increment_usage(template_id)
            .await;

        Ok(count)
    }
}

/// ModuleApprovalCallback implementation for WorkOrderService
#[async_trait]
impl ModuleApprovalCallback for WorkOrderService {
    async fn on_final_approval(
        &self,
        request: &management_system_core::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<()> {
        // Get the work order ID from the approval request
        let wo_id = request.resource_id;
        
        // Update work order status to approved
        self.repository
            .update_status(wo_id, "approved")
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Broadcast notification
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_APPROVED", serde_json::json!({ "work_order_id": wo_id, "approver_id": approver_id, "notes": notes }))
            .await;

        Ok(())
    }

    async fn on_rejection(
        &self,
        request: &management_system_core::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        notes: String,
    ) -> DomainResult<()> {
        let wo_id = request.resource_id;
        
        // Update work order status to rejected
        self.repository
            .update_status(wo_id, "rejected")
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Broadcast notification
        let _ = self
            .notification_service
            .broadcast("WORK_ORDER_REJECTED", serde_json::json!({ "work_order_id": wo_id, "approver_id": approver_id, "notes": notes }))
            .await;

        Ok(())
    }

    fn module_name(&self) -> &'static str {
        "work_order"
    }
}
