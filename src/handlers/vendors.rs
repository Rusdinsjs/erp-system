use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    ApiResponse, CreateVendorRequest, PaginatedResponse, PaginationParams, UpdateVendorRequest,
    Vendor, VendorList,
};

/// List all vendors
pub async fn list_vendors(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<VendorList>>, (StatusCode, String)> {
    let offset = params.offset();
    let limit = params.per_page();

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM vendors")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let vendors = sqlx::query_as::<_, VendorList>(
        r#"
        SELECT id, code, name, contact_person, phone, is_active
        FROM vendors
        ORDER BY name
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PaginatedResponse::new(
        vendors,
        total.0,
        params.page(),
        limit,
    )))
}

/// Get vendor by ID
pub async fn get_vendor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vendor>, (StatusCode, String)> {
    let vendor = sqlx::query_as::<_, Vendor>(
        r#"
        SELECT id, code, name, contact_person, phone, email, address, is_active, created_at, updated_at
        FROM vendors
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Vendor not found".to_string()))?;

    Ok(Json(vendor))
}

/// Create a new vendor
pub async fn create_vendor(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateVendorRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Vendor>>), (StatusCode, String)> {
    let vendor = sqlx::query_as::<_, Vendor>(
        r#"
        INSERT INTO vendors (code, name, contact_person, phone, email, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, code, name, contact_person, phone, email, address, is_active, created_at, updated_at
        "#,
    )
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.contact_person)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            vendor,
            "Vendor created successfully",
        )),
    ))
}

/// Update a vendor
pub async fn update_vendor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateVendorRequest>,
) -> Result<Json<ApiResponse<Vendor>>, (StatusCode, String)> {
    let vendor = sqlx::query_as::<_, Vendor>(
        r#"
        UPDATE vendors
        SET 
            code = COALESCE($2, code),
            name = COALESCE($3, name),
            contact_person = COALESCE($4, contact_person),
            phone = COALESCE($5, phone),
            email = COALESCE($6, email),
            address = COALESCE($7, address),
            is_active = COALESCE($8, is_active)
        WHERE id = $1
        RETURNING id, code, name, contact_person, phone, email, address, is_active, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&payload.code)
    .bind(&payload.name)
    .bind(&payload.contact_person)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(payload.is_active)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Vendor not found".to_string()))?;

    Ok(Json(ApiResponse::success_with_message(
        vendor,
        "Vendor updated successfully",
    )))
}

/// Delete a vendor
pub async fn delete_vendor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM vendors WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Vendor not found".to_string()));
    }

    Ok(Json(ApiResponse::success_with_message(
        (),
        "Vendor deleted successfully",
    )))
}
