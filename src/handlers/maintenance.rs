use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    ApiResponse, CreateMaintenanceRequest, MaintenanceList, MaintenanceRecord, MaintenanceType,
    PaginatedResponse, PaginationParams, UpdateMaintenanceRequest,
};

/// List maintenance types
pub async fn list_maintenance_types(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<MaintenanceType>>, (StatusCode, String)> {
    let types = sqlx::query_as::<_, MaintenanceType>(
        "SELECT id, code, name, is_preventive FROM maintenance_types ORDER BY id",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(types))
}

/// List all maintenance records
pub async fn list_maintenance(
    State(pool): State<PgPool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<MaintenanceList>>, (StatusCode, String)> {
    let offset = params.offset();
    let limit = params.per_page();

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM maintenance_records")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let records = sqlx::query_as::<_, MaintenanceList>(
        r#"
        SELECT id, asset_id, maintenance_type_id, scheduled_date, actual_date, status, cost
        FROM maintenance_records
        ORDER BY scheduled_date DESC NULLS LAST
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PaginatedResponse::new(
        records,
        total.0,
        params.page(),
        limit,
    )))
}

/// Get maintenance by ID
pub async fn get_maintenance(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<MaintenanceRecord>, (StatusCode, String)> {
    let record = sqlx::query_as::<_, MaintenanceRecord>(
        r#"
        SELECT 
            id, asset_id, maintenance_type_id,
            scheduled_date, actual_date,
            description, findings, actions_taken,
            cost, currency_id,
            performed_by, vendor_id,
            status,
            next_service_date, odometer_reading,
            created_by, created_at, updated_at
        FROM maintenance_records
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            "Maintenance record not found".to_string(),
        )
    })?;

    Ok(Json(record))
}

/// Create a new maintenance record
pub async fn create_maintenance(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateMaintenanceRequest>,
) -> Result<(StatusCode, Json<ApiResponse<MaintenanceRecord>>), (StatusCode, String)> {
    let record = sqlx::query_as::<_, MaintenanceRecord>(
        r#"
        INSERT INTO maintenance_records (
            asset_id, maintenance_type_id,
            scheduled_date, actual_date,
            description, findings, actions_taken,
            cost, currency_id,
            performed_by, vendor_id,
            status,
            next_service_date, odometer_reading
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING 
            id, asset_id, maintenance_type_id,
            scheduled_date, actual_date,
            description, findings, actions_taken,
            cost, currency_id,
            performed_by, vendor_id,
            status,
            next_service_date, odometer_reading,
            created_by, created_at, updated_at
        "#,
    )
    .bind(payload.asset_id)
    .bind(payload.maintenance_type_id)
    .bind(payload.scheduled_date)
    .bind(payload.actual_date)
    .bind(&payload.description)
    .bind(&payload.findings)
    .bind(&payload.actions_taken)
    .bind(payload.cost)
    .bind(payload.currency_id)
    .bind(&payload.performed_by)
    .bind(payload.vendor_id)
    .bind(payload.status.as_deref().unwrap_or("planned"))
    .bind(payload.next_service_date)
    .bind(payload.odometer_reading)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            record,
            "Maintenance record created successfully",
        )),
    ))
}

/// Update a maintenance record
pub async fn update_maintenance(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMaintenanceRequest>,
) -> Result<Json<ApiResponse<MaintenanceRecord>>, (StatusCode, String)> {
    let record = sqlx::query_as::<_, MaintenanceRecord>(
        r#"
        UPDATE maintenance_records
        SET 
            maintenance_type_id = COALESCE($2, maintenance_type_id),
            scheduled_date = COALESCE($3, scheduled_date),
            actual_date = COALESCE($4, actual_date),
            description = COALESCE($5, description),
            findings = COALESCE($6, findings),
            actions_taken = COALESCE($7, actions_taken),
            cost = COALESCE($8, cost),
            currency_id = COALESCE($9, currency_id),
            performed_by = COALESCE($10, performed_by),
            vendor_id = COALESCE($11, vendor_id),
            status = COALESCE($12, status),
            next_service_date = COALESCE($13, next_service_date),
            odometer_reading = COALESCE($14, odometer_reading)
        WHERE id = $1
        RETURNING 
            id, asset_id, maintenance_type_id,
            scheduled_date, actual_date,
            description, findings, actions_taken,
            cost, currency_id,
            performed_by, vendor_id,
            status,
            next_service_date, odometer_reading,
            created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.maintenance_type_id)
    .bind(payload.scheduled_date)
    .bind(payload.actual_date)
    .bind(&payload.description)
    .bind(&payload.findings)
    .bind(&payload.actions_taken)
    .bind(payload.cost)
    .bind(payload.currency_id)
    .bind(&payload.performed_by)
    .bind(payload.vendor_id)
    .bind(&payload.status)
    .bind(payload.next_service_date)
    .bind(payload.odometer_reading)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            "Maintenance record not found".to_string(),
        )
    })?;

    Ok(Json(ApiResponse::success_with_message(
        record,
        "Maintenance record updated successfully",
    )))
}

/// Delete a maintenance record
pub async fn delete_maintenance(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM maintenance_records WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            "Maintenance record not found".to_string(),
        ));
    }

    Ok(Json(ApiResponse::success_with_message(
        (),
        "Maintenance record deleted successfully",
    )))
}
