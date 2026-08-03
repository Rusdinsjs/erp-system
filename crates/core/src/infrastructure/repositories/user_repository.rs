//! User Repository

use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::domain::entities::{User, UserSummary};

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                u.phone, u.avatar_url, u.allowed_asset_group,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE u.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                u.phone, u.avatar_url, u.allowed_asset_group,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE u.email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<UserSummary>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT 
                u.id, u.email, u.name, 
                COALESCE(r.code, u.role) as role_code,
                COALESCE((SELECT MIN(r2.role_level) FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id), r.role_level, 5) as role_level,
                u.department, u.department_id, u.is_active, NULL::timestamptz as last_login_at,
                e.id as employee_id, e.name as employee_name, e.nik as employee_nik, e.photo_url as employee_photo_url,
                u.allowed_asset_group,
                COALESCE((
                    SELECT JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT('id', r_all.id, 'code', r_all.code, 'name', r_all.name, 'role_level', r_all.role_level))
                    FROM user_roles ur_all
                    JOIN roles r_all ON ur_all.role_id = r_all.id
                    WHERE ur_all.user_id = u.id
                ), '[]'::jsonb) as roles
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            ORDER BY u.name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let users = rows
            .into_iter()
            .map(|r| UserSummary {
                id: r.get("id"),
                email: r.get("email"),
                name: r.get("name"),
                role: r.get("role_code"),
                role_level: r.get::<i32, _>("role_level"),
                department: r.get("department"),
                department_id: r.get("department_id"),
                is_active: r.get("is_active"),
                employee_id: r.get("employee_id"),
                employee_name: r.get("employee_name"),
                employee_nik: r.get("employee_nik"),
                employee_photo_url: r.get("employee_photo_url"),
                allowed_asset_group: r.get("allowed_asset_group"),
                roles: r.try_get::<serde_json::Value, _>("roles").ok(),
                last_login_at: r.get("last_login_at"),
            })
            .collect();

        Ok(users)
    }

    pub async fn set_user_roles(&self, user_id: Uuid, role_codes: &[String]) -> Result<(), sqlx::Error> {
        // Clear existing user_roles
        sqlx::query("DELETE FROM user_roles WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        if !role_codes.is_empty() {
            sqlx::query(
                r#"
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, id FROM roles WHERE code = ANY($2::text[])
                ON CONFLICT DO NOTHING
                "#,
            )
            .bind(user_id)
            .bind(role_codes)
            .execute(&self.pool)
            .await?;

            // Update primary role_id on users table to the highest level role
            sqlx::query(
                r#"
                UPDATE users
                SET role_id = (
                    SELECT r.id FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1
                    ORDER BY r.role_level ASC
                    LIMIT 1
                ),
                role = (
                    SELECT r.code FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1
                    ORDER BY r.role_level ASC
                    LIMIT 1
                )
                WHERE id = $1
                "#,
            )
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn link_employee(&self, user_id: Uuid, employee_id: Uuid) -> Result<(), sqlx::Error> {
        // Clear any previous link for this user
        sqlx::query("UPDATE employees SET user_id = NULL WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        // Clear any previous link for target employee
        sqlx::query("UPDATE employees SET user_id = NULL WHERE id = $1")
            .bind(employee_id)
            .execute(&self.pool)
            .await?;

        // Link target employee to user
        sqlx::query("UPDATE employees SET user_id = $1, updated_at = NOW() WHERE id = $2")
            .bind(user_id)
            .bind(employee_id)
            .execute(&self.pool)
            .await?;

        // Synchronize user.name & avatar_url from linked employee
        sqlx::query(
            "UPDATE users SET name = e.name, email = e.email, avatar_url = COALESCE(e.photo_url, users.avatar_url), updated_at = NOW() FROM employees e WHERE users.id = $1 AND e.id = $2"
        )
        .bind(user_id)
        .bind(employee_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn unlink_employee(&self, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE employees SET user_id = NULL, updated_at = NOW() WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn create(&self, user: &User) -> Result<User, sqlx::Error> {
        // First get default role from DB if role_id is None?
        // Or assume caller sets it?
        // For now, simpler: Insert user, role_id might be null or set.
        // Logic: if role_id is None, try to find role by string 'role'?

        // Actually, let's keep it simple: Insert into users.
        // We need to return joined data.
        sqlx::query_as::<_, User>(
            r#"
            WITH inserted_user AS (
                INSERT INTO users (id, email, password_hash, name, role, role_id, department, department_id, organization_id, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            )
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                NULL::text as phone, NULL::text as avatar_url, u.allowed_asset_group,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM inserted_user u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            "#,
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.name)
        .bind(&user.role) // Legacy string
        .bind(user.role_id)
        .bind(&user.department)
        .bind(user.department_id)
        .bind(user.organization_id)
        .bind(user.is_active)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_last_login(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_password(&self, id: Uuid, password_hash: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .bind(password_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        &self,
        id: Uuid,
        name: Option<String>,
        role_id: Option<Uuid>,
        role_code: Option<String>, // Legacy fallback
        department: Option<String>,
        department_id: Option<Uuid>,
        avatar_url: Option<String>,
        is_active: Option<bool>,
        allowed_asset_group: Option<String>,
    ) -> Result<User, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            WITH updated_user AS (
                UPDATE users 
                SET 
                    name = COALESCE($2, name),
                    role_id = COALESCE($3, role_id),
                    role = COALESCE($4, role),
                    department = CASE WHEN $5 = '__CLEAR__' THEN NULL WHEN $5 IS NOT NULL THEN $5 ELSE department END,
                    department_id = CASE WHEN $5 = '__CLEAR__' THEN NULL WHEN $6 IS NOT NULL THEN $6 ELSE department_id END,
                    avatar_url = COALESCE($7, avatar_url),
                    is_active = COALESCE($8, is_active),
                    allowed_asset_group = CASE WHEN $9 = '__CLEAR__' THEN NULL WHEN $9 IS NOT NULL THEN $9 ELSE allowed_asset_group END,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            ),
            synced_employee AS (
                UPDATE employees
                SET name = u.name, updated_at = NOW()
                FROM updated_user u
                WHERE employees.user_id = u.id
                RETURNING employees.*
            )
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                u.phone, u.avatar_url, u.allowed_asset_group,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(role_id)
        .bind(role_code)
        .bind(department)
        .bind(department_id)
        .bind(avatar_url)
        .bind(is_active)
        .bind(allowed_asset_group)
        .fetch_one(&self.pool)
        .await
    }
    pub async fn update_profile(
        &self,
        id: Uuid,
        name: String,
        phone: Option<String>,
    ) -> Result<User, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            WITH updated_user AS (
                UPDATE users 
                SET 
                    name = $2,
                    phone = $3,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            )
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(phone)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_avatar(&self, id: Uuid, avatar_url: String) -> Result<User, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            WITH updated_user AS (
                UPDATE users 
                SET 
                    avatar_url = $2,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            )
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id, e.id as employee_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN employees e ON u.id = e.user_id
            "#,
        )
        .bind(id)
        .bind(avatar_url)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn deactivate_by_employee_id(&self, employee_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE users
            SET is_active = false, updated_at = NOW()
            WHERE id = (SELECT user_id FROM employees WHERE id = $1)
               OR employee_id = $1
            "#,
        )
        .bind(employee_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
