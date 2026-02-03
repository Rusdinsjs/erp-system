use std::sync::Arc;
use uuid::Uuid;

use management_system_core::domain::entities::{
    CategoryAttributeTemplate, CategoryTemplateWithName, CreateCategoryAttributeTemplateRequest,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::repositories::CategoryTemplateRepository;

#[derive(Clone)]
pub struct CategoryTemplateService {
    repo: Arc<CategoryTemplateRepository>,
}

impl CategoryTemplateService {
    pub fn new(repo: Arc<CategoryTemplateRepository>) -> Self {
        Self { repo }
    }

    pub async fn list_all(&self) -> DomainResult<Vec<CategoryTemplateWithName>> {
        let templates = self
            .repo
            .list()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;
        Ok(templates)
    }

    pub async fn upsert(
        &self,
        req: CreateCategoryAttributeTemplateRequest,
    ) -> DomainResult<CategoryAttributeTemplate> {
        let template =
            self.repo
                .upsert(req)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        Ok(template)
    }

    pub async fn delete(&self, category_id: Uuid) -> DomainResult<()> {
        self.repo
            .delete(category_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;
        Ok(())
    }
}
