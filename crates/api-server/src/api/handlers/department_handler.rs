use crate::api::server::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Department {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDepartmentRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDepartmentRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
}

// Helper to map errors
fn internal_error<E>(err: E) -> (StatusCode, Json<serde_json::Value>)
where
    E: std::fmt::Display,
{
    tracing::error!("Internal DB Error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": err.to_string() })),
    )
}

/// List all departments
pub async fn list_departments(
    State(state): State<AppState>,
) -> Result<Json<Vec<Department>>, (StatusCode, Json<serde_json::Value>)> {
    let departments =
        sqlx::query_as::<_, Department>("SELECT * FROM departments ORDER BY name ASC")
            .fetch_all(&state.pool)
            .await
            .map_err(internal_error)?;

    Ok(Json(departments))
}

/// Department tree node with children
#[derive(Debug, Serialize)]
pub struct DepartmentTreeNode {
    #[serde(flatten)]
    pub department: Department,
    pub children: Vec<DepartmentTreeNode>,
}

/// Build tree from flat list of departments
fn build_department_tree(
    departments: Vec<Department>,
    parent_id: Option<Uuid>,
) -> Vec<DepartmentTreeNode> {
    departments
        .iter()
        .filter(|d| d.parent_id == parent_id)
        .map(|d| DepartmentTreeNode {
            department: d.clone(),
            children: build_department_tree(departments.clone(), Some(d.id)),
        })
        .collect()
}

/// List departments as tree structure
pub async fn list_departments_tree(
    State(state): State<AppState>,
) -> Result<Json<Vec<DepartmentTreeNode>>, (StatusCode, Json<serde_json::Value>)> {
    let departments =
        sqlx::query_as::<_, Department>("SELECT * FROM departments ORDER BY name ASC")
            .fetch_all(&state.pool)
            .await
            .map_err(internal_error)?;

    let tree = build_department_tree(departments, None);
    Ok(Json(tree))
}

/// Get single department
pub async fn get_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    let department = sqlx::query_as::<_, Department>("SELECT * FROM departments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ))?;

    Ok(Json(department))
}

/// Create new department
pub async fn create_department(
    State(state): State<AppState>,
    Json(payload): Json<CreateDepartmentRequest>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    let department = sqlx::query_as::<_, Department>(
        r#"
        INSERT INTO departments (id, code, name, description, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(payload.code)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.parent_id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    Ok(Json(department))
}

/// Update department
pub async fn update_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDepartmentRequest>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    // Check existence
    let _ = sqlx::query("SELECT id FROM departments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ))?;

    let current = sqlx::query_as::<_, Department>("SELECT * FROM departments WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
        .map_err(internal_error)?;

    let code = payload.code.unwrap_or(current.code);
    let name = payload.name.unwrap_or(current.name);
    let description = payload.description.or(current.description);
    let parent_id = payload.parent_id.or(current.parent_id);

    let updated = sqlx::query_as::<_, Department>(
        r#"
        UPDATE departments 
        SET code = $1, name = $2, description = $3, parent_id = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
        "#,
    )
    .bind(code)
    .bind(name)
    .bind(description)
    .bind(parent_id)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    Ok(Json(updated))
}

/// Delete department
pub async fn delete_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query("DELETE FROM departments WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(internal_error)?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
