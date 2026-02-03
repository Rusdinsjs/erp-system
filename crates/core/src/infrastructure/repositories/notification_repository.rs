//! Notification Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::notification::{
    Notification, NotificationPreference, NotificationTemplate,
};

#[derive(Clone)]
pub struct NotificationRepository {
    pool: PgPool,
}

impl NotificationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Notification>, sqlx::Error> {
        sqlx::query_as::<_, Notification>("SELECT * FROM notifications WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_by_user(
        &self,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Notification>, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_unread(&self, user_id: Uuid) -> Result<Vec<Notification>, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            SELECT * FROM notifications
            WHERE user_id = $1 AND is_read = false
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn count_unread(&self, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let result: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(result.0)
    }

    pub async fn create(&self, notification: &Notification) -> Result<Notification, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            INSERT INTO notifications (id, user_id, template_id, title, message, data, channel, entity_type, entity_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#
        )
        .bind(notification.id)
        .bind(notification.user_id)
        .bind(notification.template_id)
        .bind(&notification.title)
        .bind(&notification.message)
        .bind(&notification.data)
        .bind(&notification.channel)
        .bind(&notification.entity_type)
        .bind(notification.entity_id)
        .bind(notification.is_read)
        .bind(notification.created_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn mark_as_read(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1")
                .bind(id)
                .execute(&self.pool)
                .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn mark_all_as_read(&self, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false"
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() as i64)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM notifications WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    // Template Methods
    pub async fn find_template_by_code(
        &self,
        code: &str,
    ) -> Result<Option<NotificationTemplate>, sqlx::Error> {
        sqlx::query_as::<_, NotificationTemplate>(
            "SELECT * FROM notification_templates WHERE code = $1",
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn get_user_preferences(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<NotificationPreference>, sqlx::Error> {
        sqlx::query_as::<_, NotificationPreference>(
            "SELECT * FROM notification_preferences WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_admins(&self) -> Result<Vec<Uuid>, sqlx::Error> {
        let result: Vec<(Uuid,)> = sqlx::query_as(
            r#"
            SELECT u.id FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE r.code IN ('admin', 'super_admin') OR u.role IN ('admin', 'super_admin')
            "#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(result.into_iter().map(|(id,)| id).collect())
    }
}
