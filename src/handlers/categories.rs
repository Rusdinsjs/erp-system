use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    ApiResponse, Category, CategoryList, CreateCategoryRequest, PaginatedResponse,
    PaginationParams, UpdateCategoryRequest,
};

/// List all categories
pub async fn list_categories(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<CategoryList>>, (StatusCode, String)> {
    let offset = params.offset();
    let limit = params.per_page();

    // Get total count
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM categories")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get paginated data
    let categories = sqlx::query_as::<_, CategoryList>(
        r#"
        SELECT id, parent_id, code, name, description
        FROM categories
        ORDER BY code
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PaginatedResponse::new(
        categories,
        total.0,
        params.page(),
        limit,
    )))
}

/// Get category by ID
pub async fn get_category(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Category>, (StatusCode, String)> {
    let category = sqlx::query_as::<_, Category>(
        r#"
        SELECT id, parent_id, code, name, description, attributes, created_at, updated_at
        FROM categories
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Category not found".to_string()))?;

    Ok(Json(category))
}

/// Create a new category
pub async fn create_category(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Category>>), (StatusCode, String)> {
    let category = sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (parent_id, code, name, description, attributes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, parent_id, code, name, description, attributes, created_at, updated_at
        "#,
    )
    .bind(payload.parent_id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.attributes)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            category,
            "Category created successfully",
        )),
    ))
}

/// Update a category
pub async fn update_category(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCategoryRequest>,
) -> Result<Json<ApiResponse<Category>>, (StatusCode, String)> {
    let category = sqlx::query_as::<_, Category>(
        r#"
        UPDATE categories
        SET 
            parent_id = COALESCE($2, parent_id),
            code = COALESCE($3, code),
            name = COALESCE($4, name),
            description = COALESCE($5, description),
            attributes = COALESCE($6, attributes)
        WHERE id = $1
        RETURNING id, parent_id, code, name, description, attributes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.parent_id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.attributes)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Category not found".to_string()))?;

    Ok(Json(ApiResponse::success_with_message(
        category,
        "Category updated successfully",
    )))
}

/// Delete a category
pub async fn delete_category(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Category not found".to_string()));
    }

    Ok(Json(ApiResponse::success_with_message(
        (),
        "Category deleted successfully",
    )))
}
