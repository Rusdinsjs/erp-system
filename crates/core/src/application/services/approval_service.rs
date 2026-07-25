use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    approval_repository::scan_approval_request::CreateApprovalRequest,
    approval_repository::ApprovalRequest, ApprovalRepository,
};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Clone)]
pub struct ApprovalService {
    pub repository: ApprovalRepository,
}

impl ApprovalService {
    pub fn new(repository: ApprovalRepository) -> Self {
        Self { repository }
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

    pub async fn list_pending(&self, role_level: i32) -> DomainResult<Vec<ApprovalRequest>> {
        // Supervisor (3) approves Level 1
        // Manager (2) approves Level 2
        let target_level = if role_level == 3 {
            1
        } else if role_level == 2 {
            2
        } else {
            0
        };

        if target_level == 0 {
            return Ok(vec![]); // Or return all if superadmin?
        }

        self.repository
            .list_pending(target_level)
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
            format!("APPROVED_L{}", request.current_approval_level) // Or just "APPROVED" depending on old logic, but let's stick to L_x
        } else {
            format!("APPROVED_L{}", request.current_approval_level)
        };

        self.repository
            .update_status(request_id, &status, request.current_approval_level, Some(approver_id), notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if !is_final {
            self.repository
                .increment_level(request_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
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

        // Update to REJECTED
        self.repository
            .update_status(
                request_id,
                "REJECTED",
                request.current_approval_level,
                Some(approver_id),
                Some(notes),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
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
