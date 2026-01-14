use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    ApiResponse, CreateLocationRequest, Location, LocationList, PaginatedResponse,
    PaginationParams, UpdateLocationRequest,
};

/// List all locations
pub async fn list_locations(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<LocationList>>, (StatusCode, String)> {
    let offset = params.offset();
    let limit = params.per_page();

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM locations")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let locations = sqlx::query_as::<_, LocationList>(
        r#"
        SELECT id, parent_id, code, name, type
        FROM locations
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
        locations,
        total.0,
        params.page(),
        limit,
    )))
}

/// Get location by ID
pub async fn get_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Location>, (StatusCode, String)> {
    let location = sqlx::query_as::<_, Location>(
        r#"
        SELECT id, parent_id, code, name, type, address, created_at, updated_at
        FROM locations
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Location not found".to_string()))?;

    Ok(Json(location))
}

/// Create a new location
pub async fn create_location(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateLocationRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Location>>), (StatusCode, String)> {
    let location = sqlx::query_as::<_, Location>(
        r#"
        INSERT INTO locations (parent_id, code, name, type, address)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, parent_id, code, name, type, address, created_at, updated_at
        "#,
    )
    .bind(payload.parent_id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.r#type)
    .bind(&payload.address)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            location,
            "Location created successfully",
        )),
    ))
}

/// Update a location
pub async fn update_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateLocationRequest>,
) -> Result<Json<ApiResponse<Location>>, (StatusCode, String)> {
    let location = sqlx::query_as::<_, Location>(
        r#"
        UPDATE locations
        SET 
            parent_id = COALESCE($2, parent_id),
            code = COALESCE($3, code),
            name = COALESCE($4, name),
            type = COALESCE($5, type),
            address = COALESCE($6, address)
        WHERE id = $1
        RETURNING id, parent_id, code, name, type, address, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.parent_id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.r#type)
    .bind(&payload.address)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Location not found".to_string()))?;

    Ok(Json(ApiResponse::success_with_message(
        location,
        "Location updated successfully",
    )))
}

/// Delete a location
pub async fn delete_location(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM locations WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Location not found".to_string()));
    }

    Ok(Json(ApiResponse::success_with_message(
        (),
        "Location deleted successfully",
    )))
}
