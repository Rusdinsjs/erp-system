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
        instructions: Option<String>,
        expected_result: Option<String>,
    ) -> DomainResult<TemplateTask> {
        let task = TemplateTask::new(
            template_id,
            task_number,
            description,
            instructions,
            expected_result,
        );
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

    pub async fn duplicate_template(
        &self,
        template_id: Uuid,
        new_name: String,
    ) -> DomainResult<MaintenanceTemplate> {
        let orig = self.get_template(template_id).await?;

        let new_template = MaintenanceTemplate::new(
            new_name,
            orig.template.description,
            orig.template.asset_category_id,
        );

        let created_template = self
            .repository
            .create_template(&new_template)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        for task in orig.tasks {
            let new_task = TemplateTask::new(
                created_template.id,
                task.task_number,
                task.description,
                task.instructions,
                task.expected_result,
            );
            let _ = self.repository.add_task(&new_task).await.map_err(|e| {
                DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                }
            })?;
        }

        Ok(created_template)
    }

    pub async fn reorder_tasks(&self, _template_id: Uuid, task_ids: Vec<Uuid>) -> DomainResult<()> {
        for (idx, task_id) in task_ids.iter().enumerate() {
            self.repository
                .update_task_number(*task_id, (idx + 1) as i32)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }
        Ok(())
    }

    pub async fn get_versions(&self, template_id: Uuid) -> DomainResult<Vec<MaintenanceTemplate>> {
        self.repository
            .get_versions(template_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
