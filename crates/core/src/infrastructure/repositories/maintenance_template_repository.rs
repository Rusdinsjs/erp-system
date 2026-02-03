use crate::domain::entities::{MaintenanceTemplate, TemplateTask};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct MaintenanceTemplateRepository {
    pool: PgPool,
}

impl MaintenanceTemplateRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_template(
        &self,
        template: &MaintenanceTemplate,
    ) -> Result<MaintenanceTemplate, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceTemplate>(
            "INSERT INTO maintenance_templates (id, name, description, asset_category_id, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"
        )
        .bind(template.id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(template.asset_category_id)
        .bind(template.created_at)
        .bind(template.updated_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_template(&self, id: Uuid) -> Result<Option<MaintenanceTemplate>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceTemplate>(
            "SELECT * FROM maintenance_templates WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_templates(&self) -> Result<Vec<MaintenanceTemplate>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceTemplate>(
            "SELECT * FROM maintenance_templates ORDER BY name",
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_template(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_templates WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    // Tasks for template
    pub async fn add_task(&self, task: &TemplateTask) -> Result<TemplateTask, sqlx::Error> {
        sqlx::query_as::<_, TemplateTask>(
            "INSERT INTO maintenance_template_tasks (id, template_id, task_number, description, instructions, expected_result, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *"
        )
        .bind(task.id)
        .bind(task.template_id)
        .bind(task.task_number)
        .bind(&task.description)
        .bind(&task.instructions)
        .bind(&task.expected_result)
        .bind(task.created_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_tasks(&self, template_id: Uuid) -> Result<Vec<TemplateTask>, sqlx::Error> {
        sqlx::query_as::<_, TemplateTask>(
            "SELECT * FROM maintenance_template_tasks WHERE template_id = $1 ORDER BY task_number",
        )
        .bind(template_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_task(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_template_tasks WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
