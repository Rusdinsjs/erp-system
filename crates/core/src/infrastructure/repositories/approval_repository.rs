use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use sqlx::PgPool;
use uuid::Uuid;

use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApprovalWorkflow {
    pub id: Uuid,
    pub workflow_name: String,
    pub entity_type: String,
    pub approval_levels: i32,
    pub level_1_role: Option<String>,
    pub level_2_role: Option<String>,
    pub level_3_role: Option<String>,
    pub level_4_role: Option<String>,
    pub level_5_role: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApprovalHistory {
    pub id: Uuid,
    pub approval_request_id: Uuid,
    pub action: String,
    pub actor_id: Uuid,
    pub level: i32,
    pub previous_status: Option<String>,
    pub new_status: Option<String>,
    pub notes: Option<String>,
    pub metadata: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApprovalRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub required_levels: Option<i32>,
    #[schema(example = "Asset")]
    pub resource_type: String,
    pub resource_id: Uuid,
    #[schema(example = "CREATE")]
    pub action_type: String,
    pub requested_by: Uuid,
    #[schema(value_type = Option<Object>)]
    pub data_snapshot: Option<JsonValue>,
    #[schema(example = "PENDING")]
    pub status: String,
    pub current_approval_level: i32,
    pub approved_by_l1: Option<Uuid>,
    pub approved_at_l1: Option<DateTime<Utc>>,
    pub notes_l1: Option<String>,
    pub approved_by_l2: Option<Uuid>,
    pub approved_at_l2: Option<DateTime<Utc>>,
    pub notes_l2: Option<String>,
    pub approved_by_l3: Option<Uuid>,
    pub approved_at_l3: Option<DateTime<Utc>>,
    pub notes_l3: Option<String>,
    pub approved_by_l4: Option<Uuid>,
    pub approved_at_l4: Option<DateTime<Utc>>,
    pub notes_l4: Option<String>,
    pub approved_by_l5: Option<Uuid>,
    pub approved_at_l5: Option<DateTime<Utc>>,
    pub notes_l5: Option<String>,
    pub delegated_to: Option<Uuid>,
    pub delegated_at: Option<DateTime<Utc>>,
    pub escalated_at: Option<DateTime<Utc>>,
    pub escalated_to_role: Option<String>,
    pub module_callback: Option<String>,
    pub callback_data: Option<JsonValue>,
    pub final_approved_at: Option<DateTime<Utc>>,
    pub final_approved_by: Option<Uuid>,
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

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn create(
        &self,
        req: &scan_approval_request::CreateApprovalRequest,
    ) -> Result<ApprovalRequest, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            INSERT INTO approval_requests (
                workflow_id, required_levels, resource_type, resource_id, action_type, requested_by, data_snapshot, status, current_approval_level
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 1)
            RETURNING *, NULL as requester_name
            "#,
        )
        .bind(req.workflow_id)
        .bind(req.required_levels)
        .bind(&req.resource_type)
        .bind(req.resource_id)
        .bind(&req.action_type)
        .bind(req.requested_by)
        .bind(&req.data_snapshot)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn find_workflow_by_entity(
        &self,
        entity_type: &str,
    ) -> Result<Option<ApprovalWorkflow>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalWorkflow>(
            "SELECT * FROM approval_workflows WHERE entity_type = $1 AND is_active = true LIMIT 1",
        )
        .bind(entity_type)
        .fetch_optional(&self.pool)
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

    // Get all pending requests (for super_admin)
    pub async fn list_pending_all_levels(&self) -> Result<Vec<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            WHERE ar.status = 'PENDING' 
            ORDER BY ar.created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    // Get pending requests for a specific role (matches workflow level_n_role)
    pub async fn list_pending_by_role(
        &self,
        role_code: &str,
    ) -> Result<Vec<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            JOIN approval_workflows aw ON ar.workflow_id = aw.id
            WHERE ar.status = 'PENDING' 
            AND aw.is_active = true
            AND (
                (ar.current_approval_level = 1 AND aw.level_1_role = $1)
                OR (ar.current_approval_level = 2 AND aw.level_2_role = $1)
                OR (ar.current_approval_level = 3 AND aw.level_3_role = $1)
                OR (ar.current_approval_level = 4 AND aw.level_4_role = $1)
                OR (ar.current_approval_level = 5 AND aw.level_5_role = $1)
            )
            ORDER BY ar.created_at ASC
            "#,
        )
        .bind(role_code)
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
        // Build dynamic query based on level (supports 1-5)
        let (approved_by_col, approved_at_col, notes_col) = match level {
            1 => ("approved_by_l1", "approved_at_l1", "notes_l1"),
            2 => ("approved_by_l2", "approved_at_l2", "notes_l2"),
            3 => ("approved_by_l3", "approved_at_l3", "notes_l3"),
            4 => ("approved_by_l4", "approved_at_l4", "notes_l4"),
            5 => ("approved_by_l5", "approved_at_l5", "notes_l5"),
            _ => return Err(sqlx::Error::Protocol("Invalid approval level".into())),
        };

        let query = format!(
            r#"
            UPDATE approval_requests 
            SET status = $2, 
                {} = $3, 
                {} = NOW(), 
                {} = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *, NULL as requester_name
            "#,
            approved_by_col, approved_at_col, notes_col
        );

        sqlx::query_as::<_, ApprovalRequest>(&query)
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

    pub async fn find_pending_by_resource(
        &self,
        resource_type: &str,
        resource_id: Uuid,
    ) -> Result<Option<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            WHERE ar.resource_type = $1 AND ar.resource_id = $2 AND ar.status = 'PENDING'
            ORDER BY ar.created_at DESC
            LIMIT 1
            "#,
        )
        .bind(resource_type)
        .bind(resource_id)
        .fetch_optional(&self.pool)
        .await
    }

    // Log approval history
    pub async fn log_history(
        &self,
        history: &ApprovalHistory,
    ) -> Result<ApprovalHistory, sqlx::Error> {
        sqlx::query_as::<_, ApprovalHistory>(
            r#"
            INSERT INTO approval_histories (
                approval_request_id, action, actor_id, level, previous_status, new_status, notes, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(history.approval_request_id)
        .bind(&history.action)
        .bind(history.actor_id)
        .bind(history.level)
        .bind(&history.previous_status)
        .bind(&history.new_status)
        .bind(&history.notes)
        .bind(&history.metadata)
        .fetch_one(&self.pool)
        .await
    }

    // Get approval request with history
    pub async fn find_by_id_with_history(
        &self,
        id: Uuid,
    ) -> Result<Option<(ApprovalRequest, Vec<ApprovalHistory>)>, sqlx::Error> {
        let request = self.find_by_id(id).await?;
        if let Some(req) = request {
            let history = sqlx::query_as::<_, ApprovalHistory>(
                r#"
                SELECT * FROM approval_histories 
                WHERE approval_request_id = $1 
                ORDER BY created_at ASC
                "#,
            )
            .bind(id)
            .fetch_all(&self.pool)
            .await?;
            Ok(Some((req, history)))
        } else {
            Ok(None)
        }
    }

    // List pending with module details (enriched for UI)
    pub async fn list_pending_enriched(
        &self,
        role_code: &str,
    ) -> Result<Vec<ApprovalRequest>, sqlx::Error> {
        sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT ar.*, u.name as requester_name
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requested_by = u.id
            JOIN approval_workflows aw ON ar.workflow_id = aw.id
            WHERE ar.status = 'PENDING' 
            AND aw.is_active = true
            AND (
                (ar.current_approval_level = 1 AND aw.level_1_role = $1)
                OR (ar.current_approval_level = 2 AND aw.level_2_role = $1)
                OR (ar.current_approval_level = 3 AND aw.level_3_role = $1)
                OR (ar.current_approval_level = 4 AND aw.level_4_role = $1)
                OR (ar.current_approval_level = 5 AND aw.level_5_role = $1)
            )
            ORDER BY ar.created_at ASC
            "#,
        )
        .bind(role_code)
        .fetch_all(&self.pool)
        .await
    }

    // Update module callback fields
    pub async fn update_callback_fields(
        &self,
        id: Uuid,
        module_callback: Option<String>,
        callback_data: Option<JsonValue>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE approval_requests 
            SET module_callback = $2, callback_data = $3, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(module_callback)
        .bind(callback_data)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Mark final approval
    pub async fn mark_final_approval(
        &self,
        id: Uuid,
        approver_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE approval_requests 
            SET final_approved_at = NOW(), final_approved_by = $2, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(approver_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

pub mod scan_approval_request {
    use serde_json::Value as JsonValue;
    use uuid::Uuid;

    pub struct CreateApprovalRequest {
        pub workflow_id: Option<Uuid>,
        pub required_levels: Option<i32>,
        pub resource_type: String,
        pub resource_id: Uuid,
        pub action_type: String,
        pub requested_by: Uuid,
        pub data_snapshot: Option<JsonValue>,
    }
}
