use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    approval_repository::scan_approval_request::CreateApprovalRequest,
    approval_repository::{ApprovalHistory, ApprovalRepository, ApprovalRequest},
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
            "asset",
            "work_order",
            "loan",
            "lifecycle_transition",
            "rental_request",
            "timesheet_verification",
            "conversion_request",
            "fuel_request",
            "tax_renewal",
        ];

        if !VALID_ENTITY_TYPES.contains(&resource_type) {
            return Err(DomainError::validation(
                "resource_type",
                &format!(
                    "Invalid entity type: {}. Valid types: {:?}",
                    resource_type, VALID_ENTITY_TYPES
                ),
            ));
        }

        let workflow = self
            .repository
            .find_workflow_by_entity(resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let (workflow_id, required_levels) = match workflow {
            Some(w) => (Some(w.id), Some(w.approval_levels)),
            None => {
                return Err(DomainError::validation(
                    "workflow",
                    "No active workflow found for this entity",
                ))
            }
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
            return self
                .repository
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
        let workflow = self
            .repository
            .find_workflow_by_entity(&request.resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| {
                DomainError::validation("workflow", "No active workflow found for this entity")
            })?;

        // QSEC-004: Validate approval transition eligibility & terminal state
        validate_approval_transition(&request, approver_id, &role_code, &workflow)?;

        let is_final = request.current_approval_level >= workflow.approval_levels;

        let status = if is_final {
            format!("APPROVED_FINAL")
        } else {
            format!("APPROVED_L{}", request.current_approval_level)
        };

        let previous_status = request.status.clone();

        self.repository
            .update_status(
                request_id,
                &status,
                request.current_approval_level,
                Some(approver_id),
                notes.clone(),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

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
            self.repository
                .mark_final_approval(request_id, approver_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

            if let Some(module) = &request.module_callback {
                if let Some(callback) = self.get_callback(module) {
                    let updated_request =
                        self.repository.find_by_id(request_id).await.map_err(|e| {
                            DomainError::ExternalServiceError {
                                service: "database".to_string(),
                                message: e.to_string(),
                            }
                        })?;

                    if let Some(req) = updated_request {
                        callback
                            .on_final_approval(&req, approver_id, notes)
                            .await
                            .map_err(|e| DomainError::ExternalServiceError {
                                service: "database".to_string(),
                                message: format!("Module callback failed: {}", e),
                            })?;
                    }
                }
            }
        }

        self.repository
            .find_by_id(request_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Approval request", request_id.to_string()))
    }

    pub async fn reject_request(
        &self,
        request_id: Uuid,
        approver_id: Uuid,
        role_code: &str,
        notes: String,
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

        let workflow = self
            .repository
            .find_workflow_by_entity(&request.resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| {
                DomainError::validation("workflow", "No active workflow found for this entity")
            })?;

        // QSEC-004: Validate rejection authorization & terminal state
        validate_approval_transition(&request, approver_id, role_code, &workflow)?;

        let previous_status = request.status.clone();

        let updated_request = self
            .repository
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

        if let Some(module) = &request.module_callback {
            if let Some(callback) = self.get_callback(module) {
                callback
                    .on_rejection(&request, approver_id, notes)
                    .await
                    .map_err(|e| DomainError::ExternalServiceError {
                        service: "database".to_string(),
                        message: format!("Module callback failed: {}", e),
                    })?;
            }
        }

        Ok(updated_request)
    }

    // Delegate approval to another user (QSEC-004)
    pub async fn delegate_request(
        &self,
        request_id: Uuid,
        delegator_id: Uuid,
        role_code: &str,
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

        let workflow = self
            .repository
            .find_workflow_by_entity(&request.resource_type)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| {
                DomainError::validation("workflow", "No active workflow found for this entity")
            })?;

        // QSEC-004: Validate delegation authorization & state
        validate_approval_transition(&request, delegator_id, role_code, &workflow)?;

        // Prevent self-delegation
        if delegator_id == delegated_to {
            return Err(DomainError::BusinessRuleViolation {
                rule: "SelfDelegationDenied".to_string(),
                message: "Cannot delegate approval request to oneself".to_string(),
            });
        }

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
            .ok_or_else(|| DomainError::not_found("Approval request", request_id.to_string()))
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

/// Validate approval transition eligibility & state machine rules (QSEC-004)
pub fn validate_approval_transition(
    request: &ApprovalRequest,
    actor_id: Uuid,
    role_code: &str,
    workflow: &crate::infrastructure::repositories::ApprovalWorkflow,
) -> DomainResult<()> {
    // 1. Terminal state check: cannot transition already completed/rejected requests
    if request.status.starts_with("APPROVED_FINAL")
        || request.status.starts_with("FINAL_APPROVED")
        || request.status == "REJECTED"
        || request.status == "CANCELLED"
    {
        return Err(DomainError::InvalidStateTransition {
            from: request.status.clone(),
            to: "TRANSITION_DENIED".to_string(),
        });
    }

    // 2. Check role / authorization for current level
    let expected_role = match request.current_approval_level {
        1 => workflow.level_1_role.as_deref(),
        2 => workflow.level_2_role.as_deref(),
        3 => workflow.level_3_role.as_deref(),
        4 => workflow.level_4_role.as_deref(),
        5 => workflow.level_5_role.as_deref(),
        _ => None,
    };

    let is_super_admin = role_code == "super_admin" || role_code == "admin";
    let is_delegated_approver = request.delegated_to == Some(actor_id);

    let is_role_match = match expected_role {
        Some(role) => role == role_code,
        None => false,
    };

    if !is_super_admin && !is_delegated_approver && !is_role_match {
        return Err(DomainError::validation(
            "role",
            "You are not authorized to transition this approval request",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::repositories::ApprovalWorkflow;

    fn mock_workflow() -> ApprovalWorkflow {
        ApprovalWorkflow {
            id: Uuid::new_v4(),
            entity_type: "asset".to_string(),
            workflow_name: "Asset Workflow".to_string(),
            approval_levels: 2,
            level_1_role: Some("manager".to_string()),
            level_2_role: Some("admin".to_string()),
            level_3_role: None,
            level_4_role: None,
            level_5_role: None,
            is_active: true,
        }
    }

    fn mock_request(status: &str, level: i32) -> ApprovalRequest {
        ApprovalRequest {
            id: Uuid::new_v4(),
            workflow_id: Some(Uuid::new_v4()),
            required_levels: Some(2),
            resource_type: "asset".to_string(),
            resource_id: Uuid::new_v4(),
            action_type: "CREATE".to_string(),
            requested_by: Uuid::new_v4(),
            requester_name: None,
            data_snapshot: None,
            status: status.to_string(),
            current_approval_level: level,
            approved_by_l1: None,
            approved_at_l1: None,
            notes_l1: None,
            approved_by_l2: None,
            approved_at_l2: None,
            notes_l2: None,
            approved_by_l3: None,
            approved_at_l3: None,
            notes_l3: None,
            approved_by_l4: None,
            approved_at_l4: None,
            notes_l4: None,
            approved_by_l5: None,
            approved_at_l5: None,
            notes_l5: None,
            delegated_to: None,
            delegated_at: None,
            escalated_at: None,
            escalated_to_role: None,
            module_callback: None,
            callback_data: None,
            final_approved_at: None,
            final_approved_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_unauthorized_rejection_fails() {
        let workflow = mock_workflow();
        let request = mock_request("PENDING", 1);
        let actor_id = Uuid::new_v4();

        // User role "staff" is not authorized for level 1 ("manager")
        let result = validate_approval_transition(&request, actor_id, "staff", &workflow);
        assert!(result.is_err());
    }

    #[test]
    fn test_authorized_manager_approval_succeeds() {
        let workflow = mock_workflow();
        let request = mock_request("PENDING", 1);
        let actor_id = Uuid::new_v4();

        let result = validate_approval_transition(&request, actor_id, "manager", &workflow);
        assert!(result.is_ok());
    }

    #[test]
    fn test_double_approval_terminal_state_fails() {
        let workflow = mock_workflow();
        let request = mock_request("REJECTED", 1);
        let actor_id = Uuid::new_v4();

        // Already REJECTED request cannot be acted upon again
        let result = validate_approval_transition(&request, actor_id, "manager", &workflow);
        assert!(result.is_err());
        if let Err(DomainError::InvalidStateTransition { from, .. }) = result {
            assert_eq!(from, "REJECTED");
        } else {
            panic!("Expected InvalidStateTransition error");
        }
    }

    #[test]
    fn test_delegated_approver_succeeds() {
        let workflow = mock_workflow();
        let mut request = mock_request("PENDING", 1);
        let delegate_id = Uuid::new_v4();
        request.delegated_to = Some(delegate_id);

        // Delegated user with "staff" role can approve because delegated_to matches
        let result = validate_approval_transition(&request, delegate_id, "staff", &workflow);
        assert!(result.is_ok());
    }
}
