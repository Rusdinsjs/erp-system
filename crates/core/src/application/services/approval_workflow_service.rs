use std::sync::Arc;
use uuid::Uuid;

use crate::domain::entities::ApprovalWorkflow;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    ApprovalEntityTypeRepository, ApprovalWorkflowRepository,
};

#[derive(Clone)]
pub struct ApprovalWorkflowService {
    repo: Arc<ApprovalWorkflowRepository>,
    entity_type_repo: Arc<ApprovalEntityTypeRepository>,
}

impl ApprovalWorkflowService {
    pub fn new(
        repo: Arc<ApprovalWorkflowRepository>,
        entity_type_repo: Arc<ApprovalEntityTypeRepository>,
    ) -> Self {
        Self {
            repo,
            entity_type_repo,
        }
    }

    pub async fn list_workflows(&self) -> DomainResult<Vec<ApprovalWorkflow>> {
        self.repo.find_all().await
    }

    pub async fn get_workflow(&self, id: Uuid) -> DomainResult<ApprovalWorkflow> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Approval Workflow", id))
    }

    pub async fn get_active_workflow(
        &self,
        entity_type: &str,
    ) -> DomainResult<Option<ApprovalWorkflow>> {
        self.repo.find_active_by_entity_type(entity_type).await
    }

    pub async fn create_workflow(
        &self,
        workflow: ApprovalWorkflow,
    ) -> DomainResult<ApprovalWorkflow> {
        let et = self
            .entity_type_repo
            .find_by_value(&workflow.entity_type)
            .await?;
        match et {
            Some(type_obj) if type_obj.is_active => {}
            _ => {
                return Err(DomainError::validation(
                    "entity_type",
                    &format!(
                        "Invalid entity type: '{}'. Must be a registered active entity type.",
                        workflow.entity_type
                    ),
                ));
            }
        }

        self.repo.create(&workflow).await
    }

    pub async fn update_workflow(
        &self,
        id: Uuid,
        workflow: ApprovalWorkflow,
    ) -> DomainResult<ApprovalWorkflow> {
        let et = self
            .entity_type_repo
            .find_by_value(&workflow.entity_type)
            .await?;
        match et {
            Some(type_obj) if type_obj.is_active => {}
            _ => {
                return Err(DomainError::validation(
                    "entity_type",
                    &format!(
                        "Invalid entity type: '{}'. Must be a registered active entity type.",
                        workflow.entity_type
                    ),
                ));
            }
        }

        self.repo.update(id, &workflow).await
    }

    pub async fn delete_workflow(&self, id: Uuid) -> DomainResult<()> {
        self.repo.delete(id).await
    }
}
