use crate::domain::entities::{Permission, Role, UserRoleAssignment};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct RbacRepository {
    pool: PgPool,
}

impl RbacRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // --- Role Methods ---

    pub async fn list_roles(&self) -> Result<Vec<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>("SELECT * FROM roles ORDER BY role_level ASC, name ASC")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn find_role_by_code(&self, code: &str) -> Result<Option<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>("SELECT * FROM roles WHERE code = $1")
            .bind(code)
            .fetch_optional(&self.pool)
            .await
    }

    // --- Permission Methods ---

    pub async fn list_permissions(&self) -> Result<Vec<Permission>, sqlx::Error> {
        sqlx::query_as::<_, Permission>("SELECT * FROM permissions ORDER BY resource, action")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_role_permissions(
        &self,
        role_id: Uuid,
    ) -> Result<Vec<Permission>, sqlx::Error> {
        sqlx::query_as::<_, Permission>(
            r#"
            SELECT p.* 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
            "#,
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await
    }

    // Used by AuthService for simple code list
    pub async fn get_permissions_for_role(
        &self,
        role_id: Uuid,
    ) -> Result<Vec<String>, sqlx::Error> {
        let permissions = sqlx::query_scalar::<_, String>(
            r#"
            SELECT p.code
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
            "#,
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(permissions)
    }

    // --- User Role Methods ---

    // Get roles assigned to user via user_roles table (Many-to-Many)
    // Note: Primary role is in users table, but we might support secondary roles
    pub async fn get_user_roles(&self, user_id: Uuid) -> Result<Vec<Role>, sqlx::Error> {
        // This query fetches roles from the user_roles mapping table AND the primary role from users table
        sqlx::query_as::<_, Role>(
            r#"
            SELECT r.* FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            UNION
            SELECT r.* FROM roles r
            JOIN users u ON u.role_id = r.id
            WHERE u.id = $1
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_user_permissions(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Permission>, sqlx::Error> {
        // Combine permissions from Primary Role and Secondary Roles
        sqlx::query_as::<_, Permission>(
            r#"
            SELECT DISTINCT p.* 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            LEFT JOIN users u ON u.role_id = r.id
            LEFT JOIN user_roles ur ON ur.role_id = r.id
            WHERE u.id = $1 OR ur.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn user_has_permission(
        &self,
        user_id: Uuid,
        permission_code: &str,
    ) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            LEFT JOIN users u ON u.role_id = r.id
            LEFT JOIN user_roles ur ON ur.role_id = r.id
            WHERE (u.id = $1 OR ur.user_id = $1)
            AND (p.code = $2 OR p.code = '*')
            "#,
        )
        .bind(user_id)
        .bind(permission_code)
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    // Assign secondary role
    pub async fn assign_role_to_user(
        &self,
        user_id: Uuid,
        role_id: Uuid,
        granted_by: Option<Uuid>,
        organization_id: Option<Uuid>,
    ) -> Result<UserRoleAssignment, sqlx::Error> {
        sqlx::query_as::<_, UserRoleAssignment>(
            r#"
            INSERT INTO user_roles (user_id, role_id, granted_by, organization_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(role_id)
        .bind(granted_by)
        .bind(organization_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn remove_role_from_user(
        &self,
        user_id: Uuid,
        role_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2")
            .bind(user_id)
            .bind(role_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
