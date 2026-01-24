use std::sync::Arc;
use uuid::Uuid;

use crate::domain::entities::ApprovalWorkflow;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::ApprovalWorkflowRepository;

#[derive(Clone)]
pub struct ApprovalWorkflowService {
    repo: Arc<ApprovalWorkflowRepository>,
}

impl ApprovalWorkflowService {
    pub fn new(repo: Arc<ApprovalWorkflowRepository>) -> Self {
        Self { repo }
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
        self.repo.create(&workflow).await
    }

    pub async fn update_workflow(
        &self,
        id: Uuid,
        workflow: ApprovalWorkflow,
    ) -> DomainResult<ApprovalWorkflow> {
        self.repo.update(id, &workflow).await
    }

    pub async fn delete_workflow(&self, id: Uuid) -> DomainResult<()> {
        self.repo.delete(id).await
    }
}
