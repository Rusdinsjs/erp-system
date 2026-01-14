use crate::domain::entities::Employee;
use crate::shared::errors::AppError;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct EmployeeRepository {
    pool: PgPool,
}

impl EmployeeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, employee: &Employee) -> Result<Employee, AppError> {
        let employee = sqlx::query_as::<_, Employee>(
            r#"
            INSERT INTO employees (
                id, nik, name, email, phone, department_id, position, 
                employment_status, user_id, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(employee.id)
        .bind(&employee.nik)
        .bind(&employee.name)
        .bind(&employee.email)
        .bind(&employee.phone)
        .bind(employee.department_id)
        .bind(&employee.position)
        .bind(&employee.employment_status)
        .bind(employee.user_id)
        .bind(employee.is_active)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(employee)
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Employee, AppError> {
        let employee = sqlx::query_as::<_, Employee>(
            r#"
            SELECT e.*, d.name as department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| {
            AppError::Domain(crate::domain::errors::DomainError::not_found(
                "Employee", id,
            ))
        })?;

        Ok(employee)
    }

    pub async fn get_by_nik(&self, nik: &str) -> Result<Option<Employee>, AppError> {
        let employee = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE nik = $1")
            .bind(nik)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(employee)
    }

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Option<Employee>, AppError> {
        let employee = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(employee)
    }

    pub async fn list(&self, page: i64, per_page: i64) -> Result<Vec<Employee>, AppError> {
        let offset = (page - 1) * per_page;
        let employees = sqlx::query_as::<_, Employee>(
            r#"
            SELECT e.*, d.name as department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.name ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(per_page)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(employees)
    }

    pub async fn update(&self, employee: &Employee) -> Result<Employee, AppError> {
        let employee = sqlx::query_as::<_, Employee>(
            r#"
            UPDATE employees
            SET nik = $2, name = $3, email = $4, phone = $5, 
                department_id = $6, position = $7, employment_status = $8, 
                user_id = $9, is_active = $10, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(employee.id)
        .bind(&employee.nik)
        .bind(&employee.name)
        .bind(&employee.email)
        .bind(&employee.phone)
        .bind(employee.department_id)
        .bind(&employee.position)
        .bind(&employee.employment_status)
        .bind(employee.user_id)
        .bind(employee.is_active)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(employee)
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM employees WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }
}
