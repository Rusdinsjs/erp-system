use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::rbac::{CustomDocPerm, DocType, UserPermission};
use management_system_core::shared::{AppError, AppResult};

#[derive(Debug, Deserialize)]
pub struct DocPermQuery {
    pub doctype_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CustomDocPermWithRole {
    pub id: Uuid,
    pub doctype_id: Uuid,
    pub doctype_name: String,
    pub role_id: Uuid,
    pub role_code: String,
    pub role_name: String,
    pub permlevel: i32,
    pub read_perm: bool,
    pub write_perm: bool,
    pub create_perm: bool,
    pub delete_perm: bool,
    pub submit_perm: bool,
    pub cancel_perm: bool,
    pub amend_perm: bool,
    pub print_perm: bool,
    pub email_perm: bool,
    pub export_perm: bool,
    pub import_perm: bool,
    pub share_perm: bool,
    pub report_perm: bool,
    pub if_owner: bool,
}

#[derive(Debug, Deserialize)]
pub struct SaveDocPermRequest {
    pub doctype_id: Uuid,
    pub role_id: Uuid,
    pub permlevel: i32,
    pub read_perm: bool,
    pub write_perm: bool,
    pub create_perm: bool,
    pub delete_perm: bool,
    pub submit_perm: bool,
    pub cancel_perm: bool,
    pub amend_perm: bool,
    pub print_perm: bool,
    pub email_perm: bool,
    pub export_perm: bool,
    pub import_perm: bool,
    pub share_perm: bool,
    pub report_perm: bool,
    pub if_owner: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserPermissionRequest {
    pub user_id: Uuid,
    pub allow_doctype: String,
    pub for_value: String,
    pub is_default: bool,
}

/// GET /api/rbac/doctypes - List all registered DocTypes
pub async fn list_doctypes(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let doctypes = sqlx::query_as::<_, DocType>(
        "SELECT id, name, module, description, is_submittable, created_at FROM doctypes ORDER BY module, name"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(doctypes))
}

/// GET /api/rbac/permissions - Get Custom DocPerms
pub async fn get_docperms(
    State(state): State<AppState>,
    Query(query): Query<DocPermQuery>,
) -> AppResult<impl IntoResponse> {
    let perms = if let Some(dt_id) = query.doctype_id {
        sqlx::query_as::<_, CustomDocPermWithRole>(
            r#"
            SELECT 
                dp.id, dp.doctype_id, dt.name as doctype_name,
                dp.role_id, r.code as role_code, r.name as role_name,
                dp.permlevel, dp.read_perm, dp.write_perm, dp.create_perm, dp.delete_perm,
                dp.submit_perm, dp.cancel_perm, dp.amend_perm, dp.print_perm, dp.email_perm,
                dp.export_perm, dp.import_perm, dp.share_perm, dp.report_perm, dp.if_owner
            FROM custom_docperms dp
            JOIN doctypes dt ON dt.id = dp.doctype_id
            JOIN roles r ON r.id = dp.role_id
            WHERE dp.doctype_id = $1
            ORDER BY dp.permlevel, r.name
            "#
        )
        .bind(dt_id)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
    } else {
        sqlx::query_as::<_, CustomDocPermWithRole>(
            r#"
            SELECT 
                dp.id, dp.doctype_id, dt.name as doctype_name,
                dp.role_id, r.code as role_code, r.name as role_name,
                dp.permlevel, dp.read_perm, dp.write_perm, dp.create_perm, dp.delete_perm,
                dp.submit_perm, dp.cancel_perm, dp.amend_perm, dp.print_perm, dp.email_perm,
                dp.export_perm, dp.import_perm, dp.share_perm, dp.report_perm, dp.if_owner
            FROM custom_docperms dp
            JOIN doctypes dt ON dt.id = dp.doctype_id
            JOIN roles r ON r.id = dp.role_id
            ORDER BY dt.name, dp.permlevel, r.name
            "#
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
    };

    Ok(Json(perms))
}

/// POST /api/rbac/permissions - Save / Update DocPerm
pub async fn save_docperm(
    State(state): State<AppState>,
    Json(payload): Json<SaveDocPermRequest>,
) -> AppResult<impl IntoResponse> {
    let perm = sqlx::query_as::<_, CustomDocPerm>(
        r#"
        INSERT INTO custom_docperms (
            doctype_id, role_id, permlevel, read_perm, write_perm, create_perm, delete_perm,
            submit_perm, cancel_perm, amend_perm, print_perm, email_perm, export_perm,
            import_perm, share_perm, report_perm, if_owner
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT ON CONSTRAINT uq_docperm_doctype_role_level DO UPDATE SET
            read_perm = EXCLUDED.read_perm,
            write_perm = EXCLUDED.write_perm,
            create_perm = EXCLUDED.create_perm,
            delete_perm = EXCLUDED.delete_perm,
            submit_perm = EXCLUDED.submit_perm,
            cancel_perm = EXCLUDED.cancel_perm,
            amend_perm = EXCLUDED.amend_perm,
            print_perm = EXCLUDED.print_perm,
            email_perm = EXCLUDED.email_perm,
            export_perm = EXCLUDED.export_perm,
            import_perm = EXCLUDED.import_perm,
            share_perm = EXCLUDED.share_perm,
            report_perm = EXCLUDED.report_perm,
            if_owner = EXCLUDED.if_owner,
            updated_at = NOW()
        RETURNING *
        "#
    )
    .bind(payload.doctype_id)
    .bind(payload.role_id)
    .bind(payload.permlevel)
    .bind(payload.read_perm)
    .bind(payload.write_perm)
    .bind(payload.create_perm)
    .bind(payload.delete_perm)
    .bind(payload.submit_perm)
    .bind(payload.cancel_perm)
    .bind(payload.amend_perm)
    .bind(payload.print_perm)
    .bind(payload.email_perm)
    .bind(payload.export_perm)
    .bind(payload.import_perm)
    .bind(payload.share_perm)
    .bind(payload.report_perm)
    .bind(payload.if_owner)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(perm))
}

/// DELETE /api/rbac/permissions/:id - Delete DocPerm
pub async fn delete_docperm(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    sqlx::query("DELETE FROM custom_docperms WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// GET /api/rbac/user-permissions/:user_id - Get Row-Level User Permissions
pub async fn get_user_permissions(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let user_perms = sqlx::query_as::<_, UserPermission>(
        "SELECT id, user_id, allow_doctype, for_value, is_default, created_at FROM user_permissions WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user_perms))
}

/// POST /api/rbac/user-permissions - Create User Permission constraint
pub async fn create_user_permission(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPermissionRequest>,
) -> AppResult<impl IntoResponse> {
    let perm = sqlx::query_as::<_, UserPermission>(
        r#"
        INSERT INTO user_permissions (user_id, allow_doctype, for_value, is_default)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#
    )
    .bind(payload.user_id)
    .bind(payload.allow_doctype)
    .bind(payload.for_value)
    .bind(payload.is_default)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(perm))
}

/// DELETE /api/rbac/user-permissions/:id - Delete User Permission
pub async fn delete_user_permission(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    sqlx::query("DELETE FROM user_permissions WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}
