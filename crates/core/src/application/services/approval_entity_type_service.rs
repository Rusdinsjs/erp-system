use std::sync::Arc;
use uuid::Uuid;

use crate::domain::entities::{
    ApprovalEntityType, CreateEntityTypeRequest, UpdateEntityTypeRequest,
};
use crate::domain::errors::DomainResult;
use crate::infrastructure::repositories::ApprovalEntityTypeRepository;

#[derive(Clone)]
pub struct ApprovalEntityTypeService {
    repo: Arc<ApprovalEntityTypeRepository>,
}

impl ApprovalEntityTypeService {
    pub fn new(repo: Arc<ApprovalEntityTypeRepository>) -> Self {
        Self { repo }
    }

    pub async fn get_entity_types(&self) -> DomainResult<Vec<ApprovalEntityType>> {
        self.repo.find_all_active().await
    }

    pub async fn create_entity_type(
        &self,
        request: CreateEntityTypeRequest,
    ) -> DomainResult<ApprovalEntityType> {
        self.repo.create(request).await
    }

    pub async fn update_entity_type(
        &self,
        id: Uuid,
        request: UpdateEntityTypeRequest,
    ) -> DomainResult<ApprovalEntityType> {
        self.repo.update(id, request).await
    }

    pub async fn delete_entity_type(&self, id: Uuid) -> DomainResult<()> {
        self.repo.soft_delete(id).await
    }

    pub async fn validate_entity_type(&self, entity_type: &str) -> DomainResult<bool> {
        Ok(self
            .repo
            .find_by_value(entity_type)
            .await?
            .map(|et| et.is_active)
            .unwrap_or(false))
    }
}
