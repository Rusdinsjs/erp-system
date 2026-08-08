use management_system_core::application::dto::{
    ContractTemplateResponse, CreateContractTemplateRequest, UpdateContractTemplateRequest,
};
use crate::domain::entities::ContractTemplate;
use management_system_core::domain::errors::{DomainError, DomainResult};
use crate::repositories::ContractTemplateRepository;
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct ContractTemplateService {
    repo: Arc<ContractTemplateRepository>,
}

impl ContractTemplateService {
    pub fn new(repo: Arc<ContractTemplateRepository>) -> Self {
        Self { repo }
    }

    pub async fn create_template(
        &self,
        req: CreateContractTemplateRequest,
    ) -> DomainResult<ContractTemplateResponse> {
        let template = ContractTemplate {
            id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            header_content: req.header_content,
            body_content: req.body_content,
            footer_content: req.footer_content,
            is_active: true,
            created_at: Some(Utc::now()),
            updated_at: Some(Utc::now()),
        };

        let created = self.repo.create(&template).await?;
        Ok(self.to_response(created))
    }

    pub async fn get_template(&self, id: Uuid) -> DomainResult<ContractTemplateResponse> {
        let template = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ContractTemplate", id))?;
        Ok(self.to_response(template))
    }

    pub async fn get_all_templates(&self) -> DomainResult<Vec<ContractTemplateResponse>> {
        let templates = self.repo.find_all().await?;
        Ok(templates.into_iter().map(|t| self.to_response(t)).collect())
    }

    pub async fn update_template(
        &self,
        id: Uuid,
        req: UpdateContractTemplateRequest,
    ) -> DomainResult<ContractTemplateResponse> {
        let mut template = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ContractTemplate", id))?;

        if let Some(name) = req.name {
            template.name = name;
        }
        if let Some(description) = req.description {
            template.description = Some(description);
        }
        if let Some(header) = req.header_content {
            template.header_content = Some(header);
        }
        if let Some(body) = req.body_content {
            template.body_content = body;
        }
        if let Some(footer) = req.footer_content {
            template.footer_content = Some(footer);
        }
        if let Some(active) = req.is_active {
            template.is_active = active;
        }

        template.updated_at = Some(Utc::now());

        let updated = self.repo.update(id, &template).await?;
        Ok(self.to_response(updated))
    }

    pub async fn delete_template(&self, id: Uuid) -> DomainResult<()> {
        self.repo.delete(id).await
    }

    fn to_response(&self, t: ContractTemplate) -> ContractTemplateResponse {
        ContractTemplateResponse {
            id: t.id,
            name: t.name,
            description: t.description,
            header_content: t.header_content,
            body_content: t.body_content,
            footer_content: t.footer_content,
            is_active: t.is_active,
            created_at: t.created_at,
            updated_at: t.updated_at,
        }
    }
}
