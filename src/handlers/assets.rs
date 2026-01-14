use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    ApiResponse, Asset, AssetList, CreateAssetRequest, PaginatedResponse, PaginationParams,
    UpdateAssetRequest,
};

/// List all assets with pagination
pub async fn list_assets(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<AssetList>>, (StatusCode, String)> {
    let offset = params.offset();
    let limit = params.per_page();

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM assets")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let assets = sqlx::query_as::<_, AssetList>(
        r#"
        SELECT id, asset_code, name, status, asset_class, brand, purchase_price, category_id, location_id
        FROM assets
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PaginatedResponse::new(
        assets,
        total.0,
        params.page(),
        limit,
    )))
}

/// Get asset by ID
pub async fn get_asset(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Asset>, (StatusCode, String)> {
    let asset = sqlx::query_as::<_, Asset>(
        r#"
        SELECT 
            id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
            is_rental, asset_class, status, condition_id,
            serial_number, brand, model, year_manufacture,
            specifications,
            purchase_date, purchase_price, currency_id, unit_id, quantity,
            residual_value, useful_life_months,
            qr_code_url, notes,
            created_at, updated_at
        FROM assets
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    Ok(Json(asset))
}

/// Create a new asset
pub async fn create_asset(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateAssetRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Asset>>), (StatusCode, String)> {
    let asset = sqlx::query_as::<_, Asset>(
        r#"
        INSERT INTO assets (
            asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
            is_rental, asset_class, condition_id,
            serial_number, brand, model, year_manufacture,
            specifications,
            purchase_date, purchase_price, currency_id, unit_id, quantity,
            residual_value, useful_life_months,
            notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING 
            id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
            is_rental, asset_class, status, condition_id,
            serial_number, brand, model, year_manufacture,
            specifications,
            purchase_date, purchase_price, currency_id, unit_id, quantity,
            residual_value, useful_life_months,
            qr_code_url, notes,
            created_at, updated_at
        "#,
    )
    .bind(&payload.asset_code)
    .bind(&payload.name)
    .bind(payload.category_id)
    .bind(payload.location_id)
    .bind(payload.department_id)
    .bind(payload.assigned_to)
    .bind(payload.vendor_id)
    .bind(payload.is_rental.unwrap_or(false))
    .bind(&payload.asset_class)
    .bind(payload.condition_id)
    .bind(&payload.serial_number)
    .bind(&payload.brand)
    .bind(&payload.model)
    .bind(payload.year_manufacture)
    .bind(&payload.specifications)
    .bind(payload.purchase_date)
    .bind(payload.purchase_price)
    .bind(payload.currency_id)
    .bind(payload.unit_id)
    .bind(payload.quantity)
    .bind(payload.residual_value)
    .bind(payload.useful_life_months)
    .bind(&payload.notes)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            asset,
            "Asset created successfully",
        )),
    ))
}

/// Update an asset
pub async fn update_asset(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateAssetRequest>,
) -> Result<Json<ApiResponse<Asset>>, (StatusCode, String)> {
    let asset = sqlx::query_as::<_, Asset>(
        r#"
        UPDATE assets
        SET 
            asset_code = COALESCE($2, asset_code),
            name = COALESCE($3, name),
            category_id = COALESCE($4, category_id),
            location_id = COALESCE($5, location_id),
            department_id = COALESCE($6, department_id),
            assigned_to = COALESCE($7, assigned_to),
            vendor_id = COALESCE($8, vendor_id),
            is_rental = COALESCE($9, is_rental),
            asset_class = COALESCE($10, asset_class),
            status = COALESCE($11, status),
            condition_id = COALESCE($12, condition_id),
            serial_number = COALESCE($13, serial_number),
            brand = COALESCE($14, brand),
            model = COALESCE($15, model),
            year_manufacture = COALESCE($16, year_manufacture),
            specifications = COALESCE($17, specifications),
            purchase_date = COALESCE($18, purchase_date),
            purchase_price = COALESCE($19, purchase_price),
            currency_id = COALESCE($20, currency_id),
            unit_id = COALESCE($21, unit_id),
            quantity = COALESCE($22, quantity),
            residual_value = COALESCE($23, residual_value),
            useful_life_months = COALESCE($24, useful_life_months),
            notes = COALESCE($25, notes)
        WHERE id = $1
        RETURNING 
            id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
            is_rental, asset_class, status, condition_id,
            serial_number, brand, model, year_manufacture,
            specifications,
            purchase_date, purchase_price, currency_id, unit_id, quantity,
            residual_value, useful_life_months,
            qr_code_url, notes,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&payload.asset_code)
    .bind(&payload.name)
    .bind(payload.category_id)
    .bind(payload.location_id)
    .bind(payload.department_id)
    .bind(payload.assigned_to)
    .bind(payload.vendor_id)
    .bind(payload.is_rental)
    .bind(&payload.asset_class)
    .bind(&payload.status)
    .bind(payload.condition_id)
    .bind(&payload.serial_number)
    .bind(&payload.brand)
    .bind(&payload.model)
    .bind(payload.year_manufacture)
    .bind(&payload.specifications)
    .bind(payload.purchase_date)
    .bind(payload.purchase_price)
    .bind(payload.currency_id)
    .bind(payload.unit_id)
    .bind(payload.quantity)
    .bind(payload.residual_value)
    .bind(payload.useful_life_months)
    .bind(&payload.notes)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    Ok(Json(ApiResponse::success_with_message(
        asset,
        "Asset updated successfully",
    )))
}

/// Delete an asset
pub async fn delete_asset(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM assets WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Asset not found".to_string()));
    }

    Ok(Json(ApiResponse::success_with_message(
        (),
        "Asset deleted successfully",
    )))
}
