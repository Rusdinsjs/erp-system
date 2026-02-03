use crate::domain::entities::leave::LeaveRequest;
use crate::shared::errors::AppError;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct LeaveRepository {
    pool: PgPool,
}

impl LeaveRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: &LeaveRequest) -> Result<LeaveRequest, AppError> {
        let req = sqlx::query_as::<_, LeaveRequest>(
            r#"
            INSERT INTO leave_requests (
                id, employee_id, leave_type, start_date, end_date, days_count,
                reason, status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(req.id)
        .bind(req.employee_id)
        .bind(&req.leave_type)
        .bind(req.start_date)
        .bind(req.end_date)
        .bind(req.days_count)
        .bind(&req.reason)
        .bind(&req.status)
        .bind(req.created_at)
        .bind(req.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(req)
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<LeaveRequest, AppError> {
        let req = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT l.*, e.name as employee_name, u.name as approver_name
            FROM leave_requests l
            JOIN employees e ON l.employee_id = e.id
            LEFT JOIN users u ON l.approved_by = u.id
            WHERE l.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound(format!("Leave request {}", id)))?;

        Ok(req)
    }

    pub async fn update_status(&self, req: &LeaveRequest) -> Result<LeaveRequest, AppError> {
        let req = sqlx::query_as::<_, LeaveRequest>(
            r#"
            UPDATE leave_requests
            SET status = $2, approved_by = $3, approved_at = $4, rejection_reason = $5, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(req.id)
        .bind(&req.status)
        .bind(req.approved_by)
        .bind(req.approved_at)
        .bind(&req.rejection_reason)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(req)
    }

    pub async fn list_by_employee(&self, employee_id: Uuid) -> Result<Vec<LeaveRequest>, AppError> {
        let reqs = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT l.*, e.name as employee_name
            FROM leave_requests l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.employee_id = $1
            ORDER BY l.created_at DESC
            "#,
        )
        .bind(employee_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(reqs)
    }

    pub async fn list_pending(&self) -> Result<Vec<LeaveRequest>, AppError> {
        let reqs = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT l.*, e.name as employee_name
            FROM leave_requests l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.status = 'pending'
            ORDER BY l.created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(reqs)
    }
}
