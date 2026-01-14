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
        let req = CreateApprovalRequest {
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
        _role_level: i32,
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

        // Verify Level
        // If Request is L1, Approver must be Supervisor (3) or higher (1, 2)
        // Ideally we check strict level match or "can_approve_level_1" permission

        if request.current_approval_level == 1 {
            // L1 Approval
            // Update status to APPROVED_L1 if logic requires 2 steps.
            // If fully approved after L1 (workflow dependent), set APPROVED_L2/COMPLETED logic?
            // For now assume 2 steps:
            // L1 -> APPROVED_L1 -> Increment Level -> 2

            self.repository
                .update_status(request_id, "APPROVED_L1", 1, Some(approver_id), notes)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

            self.repository
                .increment_level(request_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

            // Re-fetch updated
            let updated = self
                .repository
                .find_by_id(request_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?
                .unwrap();

            Ok(updated)
        } else if request.current_approval_level == 2 {
            // L2 Approval (Final)
            self.repository
                .update_status(request_id, "APPROVED_L2", 2, Some(approver_id), notes)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })
        } else {
            Err(DomainError::validation(
                "approval_level",
                "Invalid approval level state",
            ))
        }
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
}
