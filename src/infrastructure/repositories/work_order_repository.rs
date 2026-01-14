//! Work Order Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{ChecklistItem, WorkOrder, WorkOrderPart};

#[derive(Clone)]
pub struct WorkOrderRepository {
    pool: PgPool,
}

impl WorkOrderRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>("SELECT * FROM maintenance_work_orders WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_by_number(&self, wo_number: &str) -> Result<Option<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>("SELECT * FROM maintenance_work_orders WHERE wo_number = $1")
            .bind(wo_number)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            r#"
            SELECT * FROM maintenance_work_orders
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> Result<Vec<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            "SELECT * FROM maintenance_work_orders WHERE asset_id = $1 ORDER BY created_at DESC",
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_technician(
        &self,
        technician_id: Uuid,
    ) -> Result<Vec<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            "SELECT * FROM maintenance_work_orders WHERE assigned_technician = $1 ORDER BY priority DESC, due_date"
        )
        .bind(technician_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_pending(&self) -> Result<Vec<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            "SELECT * FROM maintenance_work_orders WHERE status = 'pending' ORDER BY priority DESC, created_at"
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_overdue(&self) -> Result<Vec<WorkOrder>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            r#"
            SELECT * FROM maintenance_work_orders
            WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')
            ORDER BY priority DESC, due_date
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(&self, wo: &WorkOrder) -> Result<WorkOrder, sqlx::Error> {
        sqlx::query_as::<_, WorkOrder>(
            r#"
            INSERT INTO maintenance_work_orders (
                id, wo_number, asset_id, wo_type, priority, status,
                scheduled_date, due_date, assigned_technician, vendor_id,
                estimated_hours, estimated_cost, problem_description,
                safety_requirements, lockout_tagout_required, created_by, location_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
            "#,
        )
        .bind(wo.id)
        .bind(&wo.wo_number)
        .bind(wo.asset_id)
        .bind(&wo.wo_type)
        .bind(&wo.priority)
        .bind(&wo.status)
        .bind(wo.scheduled_date)
        .bind(wo.due_date)
        .bind(wo.assigned_technician)
        .bind(wo.vendor_id)
        .bind(wo.estimated_hours)
        .bind(wo.estimated_cost)
        .bind(&wo.problem_description)
        .bind(&wo.safety_requirements)
        .bind(wo.lockout_tagout_required)
        .bind(wo.created_by)
        .bind(wo.location_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE maintenance_work_orders SET status = $2, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(status)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn assign_technician(
        &self,
        id: Uuid,
        technician_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE maintenance_work_orders 
            SET assigned_technician = $2, status = 'assigned', updated_at = NOW() 
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(technician_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn start_work(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE maintenance_work_orders 
            SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW() 
            WHERE id = $1 AND status IN ('approved', 'assigned')
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn complete(
        &self,
        id: Uuid,
        completed_by: Uuid,
        work_performed: &str,
        actual_cost: Option<rust_decimal::Decimal>,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE maintenance_work_orders 
            SET status = 'completed', completed_by = $2, work_performed = $3, 
                actual_cost = $4, actual_end_date = NOW(), updated_at = NOW() 
            WHERE id = $1 AND status = 'in_progress'
            "#,
        )
        .bind(id)
        .bind(completed_by)
        .bind(work_performed)
        .bind(actual_cost)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // Checklist methods
    pub async fn get_checklists(
        &self,
        work_order_id: Uuid,
    ) -> Result<Vec<ChecklistItem>, sqlx::Error> {
        sqlx::query_as::<_, ChecklistItem>(
            "SELECT * FROM maintenance_checklists WHERE work_order_id = $1 ORDER BY task_number",
        )
        .bind(work_order_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn add_checklist_item(
        &self,
        item: &ChecklistItem,
    ) -> Result<ChecklistItem, sqlx::Error> {
        sqlx::query_as::<_, ChecklistItem>(
            r#"
            INSERT INTO maintenance_checklists (id, work_order_id, task_number, description, instructions, expected_result)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#
        )
        .bind(item.id)
        .bind(item.work_order_id)
        .bind(item.task_number)
        .bind(&item.description)
        .bind(&item.instructions)
        .bind(&item.expected_result)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn complete_checklist_item(
        &self,
        id: Uuid,
        completed_by: Uuid,
        result: &str,
    ) -> Result<bool, sqlx::Error> {
        let res = sqlx::query(
            r#"
            UPDATE maintenance_checklists 
            SET status = 'completed', completed_by = $2, completed_at = NOW(), actual_result = $3
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(completed_by)
        .bind(result)
        .execute(&self.pool)
        .await?;
        Ok(res.rows_affected() > 0)
    }

    pub async fn remove_checklist_item(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query("DELETE FROM maintenance_checklists WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }

    // Parts methods
    pub async fn get_parts(&self, work_order_id: Uuid) -> Result<Vec<WorkOrderPart>, sqlx::Error> {
        sqlx::query_as::<_, WorkOrderPart>(
            "SELECT * FROM maintenance_work_order_parts WHERE work_order_id = $1 ORDER BY added_at",
        )
        .bind(work_order_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn add_part(&self, part: &WorkOrderPart) -> Result<WorkOrderPart, sqlx::Error> {
        sqlx::query_as::<_, WorkOrderPart>(
            r#"
            INSERT INTO maintenance_work_order_parts (id, work_order_id, part_name, quantity, unit_cost, total_cost, added_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#
        )
        .bind(part.id)
        .bind(part.work_order_id)
        .bind(&part.part_name)
        .bind(part.quantity)
        .bind(part.unit_cost)
        .bind(part.total_cost)
        .bind(part.added_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn remove_part(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let res = sqlx::query("DELETE FROM maintenance_work_order_parts WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(res.rows_affected() > 0)
    }

    pub async fn update_parts_cost(
        &self,
        work_order_id: Uuid,
    ) -> Result<rust_decimal::Decimal, sqlx::Error> {
        let row: (Option<rust_decimal::Decimal>,) = sqlx::query_as(
            "SELECT SUM(total_cost) FROM maintenance_work_order_parts WHERE work_order_id = $1",
        )
        .bind(work_order_id)
        .fetch_one(&self.pool)
        .await?;

        let total = row.0.unwrap_or(rust_decimal::Decimal::ZERO);

        // Update WO parts_cost
        sqlx::query("UPDATE maintenance_work_orders SET parts_cost = $2 WHERE id = $1")
            .bind(work_order_id)
            .bind(total)
            .execute(&self.pool)
            .await?;

        Ok(total)
    }
}
