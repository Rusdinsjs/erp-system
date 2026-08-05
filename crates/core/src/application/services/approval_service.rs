use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    approval_repository::scan_approval_request::CreateApprovalRequest,
    approval_repository::{ApprovalHistory, ApprovalRequest, ApprovalRepository},
};
use async_trait::async_trait;
use chrono::Utc;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

// Trait for module-specific final approval handling
#[async_trait]
pub trait ModuleApprovalCallback: Send + Sync {
    async fn on_final_approval(
        &self,
        request: &ApprovalRequest,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<()>;

    async fn on_rejection(
        &self,
        request: &ApprovalRequest,
        approver_id: Uuid,
        notes: String,
    ) -> DomainResult<()>;

    fn module_name(&self) -> &'static str;
}

#[derive(Clone)]
pub struct ApprovalService {
    pub repository: Arc<ApprovalRepository>,
    callbacks: Arc<HashMap<String, Box<dyn ModuleApprovalCallback>>>,
}

impl ApprovalService {
    pub fn new(repository: Arc<ApprovalRepository>) -> Self {
        Self {
            repository,
            callbacks: Arc::new(HashMap::new()),
        }
    }

    pub fn with_callbacks(
        repository: Arc<ApprovalRepository>,
        callbacks: HashMap<String, Box<dyn ModuleApprovalCallback>>,
    ) -> Self {
        Self {
            repository,
            callbacks: Arc::new(callbacks),
        }
    }

    pub fn register_callback(&mut self, callback: Box<dyn ModuleApprovalCallback>) {
        if let Some(callbacks) = Arc::get_mut(&mut self.callbacks) {
            callbacks.insert(callback.module_name().to_string(), callback);
        }
    }

    fn get_callback(&self, module: &str) -> Option<&Box<dyn ModuleApprovalCallback>> {
        self.callbacks.get(module)
    }

    pub async fn create_request(
        &self,
        resource_type: &str,
        resource_id: Uuid,
        action_type: &str,
        requested_by: Uuid,
        data: Option<JsonValue>,
    ) -> DomainResult<ApprovalRequest> {
        const VALID_ENTITY_TYPES: &[&str] = &[
            "asset", "work_order", "loan", "lifecycle_transition",
            "rental_request", "timesheet_verification", "conversion_request",
            "fuel_request", "tax_renewal",
        ];

        if !VALID_ENTITY_TYPES.contains(&resource_type) {
            return Err(DomainError::validation(
                "resource_type",
                &format!("Invalid entity type: {}. Valid types: {:?}", resource_type, VALID_ENTITY_TYPES),
            ));
        }

        let workflow = self.repository
            .find_workflow_by_entity(resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let (workflow_id, required_levels) = match workflow {
            Some(w) => (Some(w.id), Some(w.approval_levels)),
            None => return Err(DomainError::validation("workflow", "No active workflow found for this entity")),
        };

        let req = CreateApprovalRequest {
            workflow_id,
            required_levels,
            resource_type: resource_type.to_string(),
            resource_id,
            action_type: action_type.to_string(),
            requested_by,
            data_snapshot: data,
        };

        self.repository
            .create(&req)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_pending(&self, user_role_code: &str) -> DomainResult<Vec<ApprovalRequest>> {
        // Find workflows where user's role matches any approval level
        // Super admin bypasses all checks
        if user_role_code == "super_admin" {
            return self.repository
                .list_pending_all_levels()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                });
        }

        self.repository
            .list_pending_by_role(user_role_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_my_requests(&self, user_id: Uuid) -> DomainResult<Vec<ApprovalRequest>> {
        self.repository
            .list_by_requester(user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn approve_request(
        &self,
        request_id: Uuid,
        approver_id: Uuid,
        role_code: String,
        notes: Option<String>,
    ) -> DomainResult<ApprovalRequest> {
        let request = self
            .repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("ApprovalRequest", request_id.to_string()))?;

        // Fetch workflow
        let workflow = self.repository
            .find_workflow_by_entity(&request.resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::validation("workflow", "No active workflow found for this entity"))?;

        // Check role
        let expected_role = match request.current_approval_level {
            1 => workflow.level_1_role,
            2 => workflow.level_2_role,
            3 => workflow.level_3_role,
            4 => workflow.level_4_role,
            5 => workflow.level_5_role,
            _ => None,
        };

        let has_permission = if role_code == "super_admin" {
            true
        } else if let Some(role) = expected_role {
            role == role_code
        } else {
            false
        };

        if !has_permission {
            return Err(DomainError::validation("role", "You are not authorized to approve this level"));
        }

        let is_final = request.current_approval_level >= workflow.approval_levels;
        
        let status = if is_final {
            format!("APPROVED_L{}", request.current_approval_level)
        } else {
            format!("APPROVED_L{}", request.current_approval_level)
        };

        let previous_status = request.status.clone();

        self.repository
            .update_status(request_id, &status, request.current_approval_level, Some(approver_id), notes.clone())
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Log history
        let history = ApprovalHistory {
            id: Uuid::new_v4(),
            approval_request_id: request_id,
            action: "approved".to_string(),
            actor_id: approver_id,
            level: request.current_approval_level,
            previous_status: Some(previous_status),
            new_status: Some(status.clone()),
            notes: notes.clone(),
            metadata: None,
            created_at: Utc::now(),
        };
        let _ = self.repository.log_history(&history).await;

        if !is_final {
            self.repository
                .increment_level(request_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        } else {
            // Final approval - mark and call module callback
            self.repository.mark_final_approval(request_id, approver_id).await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

            if let Some(module) = &request.module_callback {
                if let Some(callback) = self.get_callback(module) {
                    let updated_request = self.repository.find_by_id(request_id).await
                        .map_err(|e| DomainError::ExternalServiceError {
                            service: "database".to_string(),
                            message: e.to_string(),
                        })?;
                    
                    if let Some(req) = updated_request {
                        callback.on_final_approval(&req, approver_id, notes).await
                            .map_err(|e| DomainError::ExternalServiceError {
                                service: "database".to_string(),
                                message: format!("Module callback failed: {}", e),
                            })?;
                    }
                }
            }
        }

        // Re-fetch updated
        self.repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| {
                DomainError::not_found("Approval request", request_id.to_string())
            })
    }

    pub async fn reject_request(
        &self,
        request_id: Uuid,
        approver_id: Uuid,
        notes: String,
    ) -> DomainResult<ApprovalRequest> {
        // Find request
        let request = self
            .repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("ApprovalRequest", request_id.to_string()))?;

        let previous_status = request.status.clone();

        // Update to REJECTED
        let updated_request = self.repository
            .update_status(
                request_id,
                "REJECTED",
                request.current_approval_level,
                Some(approver_id),
                Some(notes.clone()),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Log history
        let history = ApprovalHistory {
            id: Uuid::new_v4(),
            approval_request_id: request_id,
            action: "rejected".to_string(),
            actor_id: approver_id,
            level: request.current_approval_level,
            previous_status: Some(previous_status),
            new_status: Some("REJECTED".to_string()),
            notes: Some(notes.clone()),
            metadata: None,
            created_at: Utc::now(),
        };
        let _ = self.repository.log_history(&history).await;

        // Call module callback for rejection
        if let Some(module) = &request.module_callback {
            if let Some(callback) = self.get_callback(module) {
                callback.on_rejection(&request, approver_id, notes).await
                    .map_err(|e| DomainError::ExternalServiceError {
                        service: "database".to_string(),
                        message: format!("Module callback failed: {}", e),
                    })?;
            }
        }

        Ok(updated_request)
    }

    // Delegate approval to another user
    pub async fn delegate_request(
        &self,
        request_id: Uuid,
        delegator_id: Uuid,
        delegated_to: Uuid,
        notes: Option<String>,
    ) -> DomainResult<ApprovalRequest> {
        let request = self
            .repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("ApprovalRequest", request_id.to_string()))?;

        // Update delegation fields
        sqlx::query(
            r#"
            UPDATE approval_requests 
            SET delegated_to = $2, delegated_at = NOW(), updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(request_id)
        .bind(delegated_to)
        .execute(self.repository.pool())
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "database".to_string(),
            message: e.to_string(),
        })?;

        // Log history
        let history = ApprovalHistory {
            id: Uuid::new_v4(),
            approval_request_id: request_id,
            action: "delegated".to_string(),
            actor_id: delegator_id,
            level: request.current_approval_level,
            previous_status: None,
            new_status: None,
            notes,
            metadata: Some(serde_json::json!({ "delegated_to": delegated_to.to_string() })),
            created_at: Utc::now(),
        };
        let _ = self.repository.log_history(&history).await;

        self.repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| {
                DomainError::not_found("Approval request", request_id.to_string())
            })
    }

    pub async fn find_active_request(
        &self,
        resource_type: &str,
        resource_id: Uuid,
    ) -> DomainResult<Option<ApprovalRequest>> {
        self.repository
            .find_pending_by_resource(resource_type, resource_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
