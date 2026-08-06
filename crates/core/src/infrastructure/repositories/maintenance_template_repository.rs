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
            "INSERT INTO maintenance_templates (id, name, description, asset_category_id, version, is_active, parent_id, usage_count, last_used_at, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *"
        )
        .bind(template.id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(template.asset_category_id)
        .bind(template.version)
        .bind(template.is_active)
        .bind(template.parent_id)
        .bind(template.usage_count)
        .bind(template.last_used_at)
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
            "SELECT * FROM maintenance_templates WHERE is_active = true ORDER BY name",
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

    pub async fn increment_usage(&self, template_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE maintenance_templates SET usage_count = usage_count + 1, last_used_at = NOW(), updated_at = NOW() WHERE id = $1"
        )
        .bind(template_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn get_versions(
        &self,
        template_id: Uuid,
    ) -> Result<Vec<MaintenanceTemplate>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceTemplate>(
            "SELECT * FROM maintenance_templates 
             WHERE id = $1 
                OR parent_id = $1 
                OR (parent_id IS NOT NULL AND parent_id = (SELECT parent_id FROM maintenance_templates WHERE id = $1)) 
             ORDER BY version DESC",
        )
        .bind(template_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn deactivate_version(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE maintenance_templates SET is_active = false WHERE id = $1")
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

    pub async fn update_task_number(
        &self,
        task_id: Uuid,
        new_number: i32,
    ) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE maintenance_template_tasks SET task_number = $2 WHERE id = $1")
                .bind(task_id)
                .bind(new_number)
                .execute(&self.pool)
                .await?;
        Ok(result.rows_affected() > 0)
    }
}
