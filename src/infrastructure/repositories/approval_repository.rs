use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApprovalRequest {
    pub id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub action_type: String,
    pub requested_by: Uuid,
    pub data_snapshot: Option<JsonValue>,
    pub status: String,
    pub current_approval_level: i32,
    pub approved_by_l1: Option<Uuid>,
    pub approved_at_l1: Option<DateTime<Utc>>,
    pub notes_l1: Option<String>,
    pub approved_by_l2: Option<Uuid>,
    pub approved_at_l2: Option<DateTime<Utc>>,
    pub notes_l2: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // Joined fields (optional)
    #[sqlx(default)]
    pub requester_name: Option<String>,
}

#[derive(Clone)]
pub struct ApprovalRepository {
    pool: PgPool,
}

impl ApprovalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        req: &scan_approval_request::CreateApprovalRequest,
    ) -> Result<ApprovalRequest, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            INSERT INTO approval_requests (
                resource_type, resource_id, action_type, requested_by, data_snapshot, status, current_approval_level
            )
            VALUES ($1, $2, $3, $4, $5, 'PENDING', 1)
            RETURNING *, NULL as requester_name
            "#
        )
        .bind(&req.resource_type)
        .bind(req.resource_id)
        .bind(&req.action_type)
        .bind(req.requested_by)
        .bind(&req.data_snapshot)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name 
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            WHERE ar.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_pending(&self, level: i32) -> Result<Vec<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            WHERE ar.status = 'PENDING' 
            AND ar.current_approval_level = $1
            ORDER BY ar.created_at ASC
            "#,
        )
        .bind(level)
        .fetch_all(&self.pool)
        .await
    }

    // List all requests for a user
    pub async fn list_by_requester(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            WHERE ar.requested_by = $1
            ORDER BY ar.created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn update_status(
        &self,
        id: Uuid,
        status: &str,
        level: i32,
        approver_id: Option<Uuid>,
        notes: Option<String>,
    ) -> Result<ApprovalRequest, sqlx::Error> {
        // Dynamic update based on level
        let query = if level == 1 {
            r#"
            UPDATE approval_requests 
            SET status = $2, 
                approved_by_l1 = $3, 
                approved_at_l1 = NOW(), 
                notes_l1 = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *, NULL as requester_name -- Simplified return
            "#
        } else {
            r#"
            UPDATE approval_requests 
            SET status = $2, 
                approved_by_l2 = $3, 
                approved_at_l2 = NOW(), 
                notes_l2 = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *, NULL as requester_name
            "#
        };

        sqlx::query_as::<_, ApprovalRequest>(query)
            .bind(id)
            .bind(status)
            .bind(approver_id)
            .bind(notes)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn increment_level(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE approval_requests SET current_approval_level = current_approval_level + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

pub mod scan_approval_request {
    use serde_json::Value as JsonValue;
    use uuid::Uuid;

    pub struct CreateApprovalRequest {
        pub resource_type: String,
        pub resource_id: Uuid,
        pub action_type: String,
        pub requested_by: Uuid,
        pub data_snapshot: Option<JsonValue>,
    }
}
