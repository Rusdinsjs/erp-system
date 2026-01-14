//! User Repository

use sqlx::PgPool;
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
                u.department, u.department_id, u.organization_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
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
                u.department, u.department_id, u.organization_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<UserSummary>, sqlx::Error> {
        sqlx::query_as::<_, UserSummary>(
            r#"
            SELECT 
                u.id, u.email, u.name, 
                COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.is_active,
                e.name as employee_name, e.nik as employee_nik
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
        .await
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
                u.department, u.department_id, u.organization_id,
                NULL::text as phone, NULL::text as avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM inserted_user u
            LEFT JOIN roles r ON u.role_id = r.id
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
    pub async fn update(
        &self,
        id: Uuid,
        name: Option<String>,
        role_id: Option<Uuid>,
        role_code: Option<String>, // Legacy fallback
        department: Option<String>,
        department_id: Option<Uuid>,
        is_active: Option<bool>,
    ) -> Result<User, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            WITH updated_user AS (
                UPDATE users 
                SET 
                    name = COALESCE($2, name),
                    role_id = COALESCE($3, role_id),
                    role = COALESCE($4, role),
                    department = COALESCE($5, department),
                    department_id = COALESCE($6, department_id),
                    is_active = COALESCE($7, is_active),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            )
            SELECT 
                u.id, u.email, u.password_hash, u.name, 
                u.role_id, COALESCE(r.code, u.role) as role_code, COALESCE(r.role_level, 5) as role_level,
                u.department, u.department_id, u.organization_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(role_id)
        .bind(role_code)
        .bind(department)
        .bind(department_id)
        .bind(is_active)
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
                u.department, u.department_id, u.organization_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
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
                u.department, u.department_id, u.organization_id,
                u.phone, u.avatar_url,
                u.is_active, false as email_verified, NULL::timestamptz as last_login_at,
                u.created_at, u.updated_at
            FROM updated_user u
            LEFT JOIN roles r ON u.role_id = r.id
            "#,
        )
        .bind(id)
        .bind(avatar_url)
        .fetch_one(&self.pool)
        .await
    }
}
