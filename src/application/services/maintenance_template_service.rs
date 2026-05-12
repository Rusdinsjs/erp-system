use crate::domain::entities::{MaintenanceTemplate, MaintenanceTemplateWithTasks, TemplateTask};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::MaintenanceTemplateRepository;
use uuid::Uuid;

#[derive(Clone)]
pub struct MaintenanceTemplateService {
    repository: MaintenanceTemplateRepository,
}

impl MaintenanceTemplateService {
    pub fn new(repository: MaintenanceTemplateRepository) -> Self {
        Self { repository }
    }

    pub async fn create_template(
        &self,
        name: String,
        description: Option<String>,
        asset_category_id: Option<Uuid>,
    ) -> DomainResult<MaintenanceTemplate> {
        let template = MaintenanceTemplate::new(name, description, asset_category_id);
        self.repository
            .create_template(&template)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_template(&self, id: Uuid) -> DomainResult<MaintenanceTemplateWithTasks> {
        let template = self
            .repository
            .get_template(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::NotFound {
                entity: "Maintenance Template".to_string(),
                id: id.to_string(),
            })?;

        let tasks =
            self.repository
                .get_tasks(id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok(MaintenanceTemplateWithTasks { template, tasks })
    }

    pub async fn list_templates(&self) -> DomainResult<Vec<MaintenanceTemplate>> {
        self.repository
            .list_templates()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn delete_template(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete_template(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn add_task(
        &self,
        template_id: Uuid,
        task_number: i32,
        description: String,
    ) -> DomainResult<TemplateTask> {
        let task = TemplateTask::new(template_id, task_number, description);
        self.repository
            .add_task(&task)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn delete_task(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete_task(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
