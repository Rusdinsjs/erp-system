//! Notification Repository

use sqlx::PgPool;
use uuid::Uuid;

/// Notification model
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub template_id: Option<Uuid>,
    pub title: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub channel: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub is_read: bool,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
    pub is_sent: bool,
    pub sent_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

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
            INSERT INTO notifications (id, user_id, template_id, title, message, data, channel, entity_type, entity_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
}
