use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::{
    UserClaims, Workflow, WorkflowActionLog, WorkflowState, WorkflowTransition,
};
use management_system_core::shared::{AppError, AppResult};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WorkflowWithDocType {
    pub id: Uuid,
    pub workflow_name: String,
    pub doctype_id: Uuid,
    pub doctype_name: String,
    pub is_active: bool,
    pub document_status_field: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct WorkflowDetailResponse {
    pub workflow: WorkflowWithDocType,
    pub states: Vec<WorkflowState>,
    pub transitions: Vec<WorkflowTransitionDetail>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WorkflowTransitionDetail {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub state_id: Uuid,
    pub state_name: String,
    pub action_name: String,
    pub next_state_id: Uuid,
    pub next_state_name: String,
    pub allowed_role_id: Uuid,
    pub allowed_role_name: String,
    pub allowed_role_code: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowRequest {
    pub workflow_name: String,
    pub doctype_id: Uuid,
    pub document_status_field: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveWorkflowStateRequest {
    pub state_name: String,
    pub doc_status: i32,
    pub allow_edit_role_id: Option<Uuid>,
    pub style_variant: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveWorkflowTransitionRequest {
    pub state_id: Uuid,
    pub action_name: String,
    pub next_state_id: Uuid,
    pub allowed_role_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ApplyWorkflowActionRequest {
    pub workflow_id: Uuid,
    pub document_id: Uuid,
    pub current_state_name: String,
    pub action_name: String,
    pub comments: Option<String>,
}

/// GET /api/workflows - List all Workflows
pub async fn list_workflows(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let workflows = sqlx::query_as::<_, WorkflowWithDocType>(
        r#"
        SELECT 
            w.id, w.workflow_name, w.doctype_id, dt.name as doctype_name,
            w.is_active, w.document_status_field, w.created_at, w.updated_at
        FROM workflows w
        JOIN doctypes dt ON dt.id = w.doctype_id
        ORDER BY w.workflow_name
        "#
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(workflows))
}

/// GET /api/workflows/:id - Get Workflow Details
pub async fn get_workflow_detail(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let workflow = sqlx::query_as::<_, WorkflowWithDocType>(
        r#"
        SELECT 
            w.id, w.workflow_name, w.doctype_id, dt.name as doctype_name,
            w.is_active, w.document_status_field, w.created_at, w.updated_at
        FROM workflows w
        JOIN doctypes dt ON dt.id = w.doctype_id
        WHERE w.id = $1
        "#
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or(AppError::NotFound("Workflow not found".to_string()))?;

    let states = sqlx::query_as::<_, WorkflowState>(
        "SELECT id, workflow_id, state_name, doc_status, allow_edit_role_id, style_variant, created_at FROM workflow_states WHERE workflow_id = $1 ORDER BY doc_status, state_name"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let transitions = sqlx::query_as::<_, WorkflowTransitionDetail>(
        r#"
        SELECT 
            t.id, t.workflow_id, t.state_id, s1.state_name as state_name,
            t.action_name, t.next_state_id, s2.state_name as next_state_name,
            t.allowed_role_id, r.name as allowed_role_name, r.code as allowed_role_code
        FROM workflow_transitions t
        JOIN workflow_states s1 ON s1.id = t.state_id
        JOIN workflow_states s2 ON s2.id = t.next_state_id
        JOIN roles r ON r.id = t.allowed_role_id
        WHERE t.workflow_id = $1
        ORDER BY s1.state_name
        "#
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(WorkflowDetailResponse {
        workflow,
        states,
        transitions,
    }))
}

/// POST /api/workflows - Create Workflow
pub async fn create_workflow(
    State(state): State<AppState>,
    Json(payload): Json<CreateWorkflowRequest>,
) -> AppResult<impl IntoResponse> {
    let doc_field = payload
        .document_status_field
        .unwrap_or_else(|| "workflow_state".to_string());

    let wf = sqlx::query_as::<_, Workflow>(
        r#"
        INSERT INTO workflows (workflow_name, doctype_id, document_status_field)
        VALUES ($1, $2, $3)
        RETURNING *
        "#
    )
    .bind(payload.workflow_name)
    .bind(payload.doctype_id)
    .bind(doc_field)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(wf))
}

/// POST /api/workflows/:id/states - Save State to Workflow
pub async fn save_workflow_state(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SaveWorkflowStateRequest>,
) -> AppResult<impl IntoResponse> {
    let ws = sqlx::query_as::<_, WorkflowState>(
        r#"
        INSERT INTO workflow_states (workflow_id, state_name, doc_status, allow_edit_role_id, style_variant)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT ON CONSTRAINT uq_workflow_state_name DO UPDATE SET
            doc_status = EXCLUDED.doc_status,
            allow_edit_role_id = EXCLUDED.allow_edit_role_id,
            style_variant = EXCLUDED.style_variant
        RETURNING *
        "#
    )
    .bind(id)
    .bind(payload.state_name)
    .bind(payload.doc_status)
    .bind(payload.allow_edit_role_id)
    .bind(payload.style_variant)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(ws))
}

/// POST /api/workflows/:id/transitions - Save Transition Rule
pub async fn save_workflow_transition(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SaveWorkflowTransitionRequest>,
) -> AppResult<impl IntoResponse> {
    let wt = sqlx::query_as::<_, WorkflowTransition>(
        r#"
        INSERT INTO workflow_transitions (workflow_id, state_id, action_name, next_state_id, allowed_role_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT ON CONSTRAINT uq_workflow_transition DO UPDATE SET
            next_state_id = EXCLUDED.next_state_id,
            allowed_role_id = EXCLUDED.allowed_role_id
        RETURNING *
        "#
    )
    .bind(id)
    .bind(payload.state_id)
    .bind(payload.action_name)
    .bind(payload.next_state_id)
    .bind(payload.allowed_role_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(wt))
}

/// DELETE /api/workflows/:id - Delete Workflow
pub async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    sqlx::query("DELETE FROM workflows WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/workflows/apply-action - Execute Workflow Transition & Log Audit Trail
pub async fn apply_workflow_action(
    Extension(claims): Extension<UserClaims>,
    State(state): State<AppState>,
    Json(payload): Json<ApplyWorkflowActionRequest>,
) -> AppResult<impl IntoResponse> {
    // 1. Fetch transition rule
    let transition = sqlx::query_as::<_, WorkflowTransitionDetail>(
        r#"
        SELECT 
            t.id, t.workflow_id, t.state_id, s1.state_name as state_name,
            t.action_name, t.next_state_id, s2.state_name as next_state_name,
            t.allowed_role_id, r.name as allowed_role_name, r.code as allowed_role_code
        FROM workflow_transitions t
        JOIN workflow_states s1 ON s1.id = t.state_id
        JOIN workflow_states s2 ON s2.id = t.next_state_id
        JOIN roles r ON r.id = t.allowed_role_id
        WHERE t.workflow_id = $1 AND s1.state_name = $2 AND t.action_name = $3
        "#
    )
    .bind(payload.workflow_id)
    .bind(&payload.current_state_name)
    .bind(&payload.action_name)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or(AppError::BadRequest("Transisi alur kerja tidak valid atau tidak ditemukan".to_string()))?;

    // 2. Validate User Role Authorization (User must have the allowed_role_id or role_level <= 2)
    let user_role_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM user_roles WHERE user_id = $1 AND role_id = $2"
    )
    .bind(claims.user_id())
    .bind(transition.allowed_role_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let is_admin = claims.role_level <= 2;
    if user_role_count == 0 && !is_admin {
        return Err(AppError::Forbidden(format!(
            "Aksi '{}' membutuhkan Role '{}'",
            transition.action_name, transition.allowed_role_name
        )));
    }

    // 3. Log Audit Trail in workflow_action_logs
    let log_entry = sqlx::query_as::<_, WorkflowActionLog>(
        r#"
        INSERT INTO workflow_action_logs (
            workflow_id, document_id, action_by_user_id, from_state, action_name, to_state, comments
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING *
        "#
    )
    .bind(payload.workflow_id)
    .bind(payload.document_id)
    .bind(claims.user_id())
    .bind(&payload.current_state_name)
    .bind(&payload.action_name)
    .bind(&transition.next_state_name)
    .bind(payload.comments)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "success": true,
        "new_state": transition.next_state_name,
        "log": log_entry
    })))
}
