//! Rental Handler
//!
//! API handlers for Rented-Out (external asset rental) operations.

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::application::dto::{
    ApiResponse, ApproveRentalRequest, CreateRentalRateRequest, CreateRentalRequest,
    DispatchRentalRequest, PaginationParams, RejectRentalRequest, RentalScheduleItem,
    ReturnRentalRequest, UpdateRentalRateRequest,
};
use management_system_core::domain::entities::{Rental, RentalHandover, RentalRate, UserClaims};
use management_system_core::shared::errors::AppError;
use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ScheduleParams {
    pub start: NaiveDate,
    pub end: NaiveDate,
}

// ==================== RENTAL ENDPOINTS ====================

/// List all rentals
pub async fn list_rentals(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Query(_params): Query<PaginationParams>, // Pagination not implemented in service yet
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state.rental_service.list_rentals(&claims).await?;
    Ok(Json(rentals))
}

/// Get rental by ID
pub async fn get_rental(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Rental>, AppError> {
    let rental = state.rental_service.find_rental(id).await?;
    Ok(Json(rental))
}

/// Create a new rental request
pub async fn create_rental(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateRentalRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Rental>>), AppError> {
    let user_id = Uuid::parse_str(&claims.sub)?;
    let rental = state.rental_service.create_rental(payload, user_id).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            rental,
            "Rental request created",
        )),
    ))
}

/// Approve a rental
pub async fn approve_rental(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApproveRentalRequest>,
) -> Result<Json<ApiResponse<Rental>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)?;

    // Perform approval
    state
        .rental_service
        .approve_rental(id, payload, user_id)
        .await?;

    // Fetch updated rental
    let rental = state.rental_service.find_rental(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental approved",
    )))
}

/// Reject a rental
pub async fn reject_rental(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRentalRequest>,
) -> Result<Json<ApiResponse<Rental>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)?;

    state
        .rental_service
        .reject_rental(id, payload, user_id)
        .await?;

    let rental = state.rental_service.find_rental(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental rejected",
    )))
}

/// Dispatch rental (handover out)
pub async fn dispatch_rental(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<DispatchRentalRequest>,
) -> Result<Json<ApiResponse<Rental>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)?;

    state
        .rental_service
        .dispatch_rental(id, payload, user_id)
        .await?;

    let rental = state.rental_service.find_rental(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental dispatched",
    )))
}

/// Return rental (handover in)
pub async fn return_rental(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ReturnRentalRequest>,
) -> Result<Json<ApiResponse<Rental>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)?;

    state
        .rental_service
        .return_rental(id, payload, user_id)
        .await?;

    let rental = state.rental_service.find_rental(id).await?;

    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental returned",
    )))
}

// ==================== LISTS ====================

pub async fn list_pending_rentals(
    State(state): State<AppState>,
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state.rental_service.list_pending_rentals().await?;
    Ok(Json(rentals))
}

pub async fn list_overdue_rentals(
    State(state): State<AppState>,
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state.rental_service.list_overdue_rentals().await?;
    Ok(Json(rentals))
}

// ==================== HANDOVERS ====================

pub async fn get_rental_handovers(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Result<Json<Vec<RentalHandover>>, AppError> {
    // TODO: Implement fetching handovers
    Ok(Json(vec![]))
}

pub async fn add_handover_photo(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    // TODO: Implement photo upload
    Ok(Json(ApiResponse::success(())))
}

// ==================== RATES ====================

pub async fn list_rental_rates(
    State(state): State<AppState>,
) -> Result<Json<Vec<RentalRate>>, AppError> {
    let rates = state.rental_service.list_rental_rates().await?;
    Ok(Json(rates))
}

pub async fn create_rental_rate(
    State(state): State<AppState>,
    Json(payload): Json<CreateRentalRateRequest>,
) -> Result<Json<ApiResponse<RentalRate>>, AppError> {
    let rate = state.rental_service.create_rental_rate(payload).await?;
    Ok(Json(ApiResponse::success(rate)))
}

pub async fn update_rental_rate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRentalRateRequest>,
) -> Result<Json<ApiResponse<RentalRate>>, AppError> {
    let rate = state.rental_service.update_rental_rate(id, payload).await?;
    Ok(Json(ApiResponse::success(rate)))
}

pub async fn delete_rental_rate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.rental_service.delete_rental_rate(id).await?;
    Ok(Json(ApiResponse::success(())))
}

/// Get schedule for Gantt
pub async fn get_schedule(
    State(state): State<AppState>,
    Query(params): Query<ScheduleParams>,
) -> Result<Json<Vec<RentalScheduleItem>>, AppError> {
    let items = state
        .rental_service
        .get_schedule(params.start, params.end)
        .await?;
    Ok(Json(items))
}
