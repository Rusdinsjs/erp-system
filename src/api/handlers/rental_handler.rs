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
use crate::application::dto::{
    ApiResponse, ApproveRentalRequest, CreateClientRequest, CreateRentalRateRequest,
    CreateRentalRequest, DispatchRentalRequest, PaginationParams, RejectRentalRequest,
    ReturnRentalRequest, UpdateRentalRateRequest,
};
use crate::domain::entities::{Client, Rental, RentalHandover, RentalRate, UserClaims};
use crate::shared::errors::AppError;

// ==================== RENTAL ENDPOINTS ====================

/// List all rentals
pub async fn list_rentals(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state
        .rental_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(rentals))
}

/// Get rental by ID
pub async fn get_rental(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Rental>, AppError> {
    let rental = state.rental_service.get_by_id(id).await?;
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
    let rental = state
        .rental_service
        .approve_rental(id, user_id, payload)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental approved",
    )))
}

/// Reject a rental
pub async fn reject_rental(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRentalRequest>,
) -> Result<Json<ApiResponse<Rental>>, AppError> {
    let rental = state.rental_service.reject_rental(id, payload).await?;
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
    let rental = state
        .rental_service
        .dispatch_rental(id, user_id, payload)
        .await?;
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
    let rental = state
        .rental_service
        .return_rental(id, user_id, payload)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        rental,
        "Rental returned",
    )))
}

/// List pending rentals
pub async fn list_pending_rentals(
    State(state): State<AppState>,
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state.rental_service.list_pending().await?;
    Ok(Json(rentals))
}

/// List overdue rentals
pub async fn list_overdue_rentals(
    State(state): State<AppState>,
) -> Result<Json<Vec<Rental>>, AppError> {
    let rentals = state.rental_service.list_overdue().await?;
    Ok(Json(rentals))
}

/// Get handovers for a rental
pub async fn get_rental_handovers(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<RentalHandover>>, AppError> {
    let handovers = state.rental_service.get_handovers(id).await?;
    Ok(Json(handovers))
}

// ==================== CLIENT ENDPOINTS ====================

/// List all clients
pub async fn list_clients(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Client>>, AppError> {
    let clients = state
        .rental_service
        .list_clients(params.page(), params.per_page())
        .await?;
    Ok(Json(clients))
}

/// Get client by ID
pub async fn get_client(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Client>, AppError> {
    let client = state.rental_service.get_client(id).await?;
    Ok(Json(client))
}

/// Create a new client
pub async fn create_client(
    State(state): State<AppState>,
    Json(payload): Json<CreateClientRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Client>>), AppError> {
    let client = state.rental_service.create_client(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(client, "Client created")),
    ))
}

// ==================== RENTAL RATE ENDPOINTS ====================

/// List all rental rates
pub async fn list_rental_rates(
    State(state): State<AppState>,
) -> Result<Json<Vec<RentalRate>>, AppError> {
    let rates = state.rental_service.list_rates().await?;
    Ok(Json(rates))
}

/// Create a new rental rate
pub async fn create_rental_rate(
    State(state): State<AppState>,
    Json(payload): Json<CreateRentalRateRequest>,
) -> Result<(StatusCode, Json<ApiResponse<RentalRate>>), AppError> {
    let rate = state.rental_service.create_rate(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            rate,
            "Rental rate created",
        )),
    ))
}

/// Update a rental rate
pub async fn update_rental_rate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRentalRateRequest>,
) -> Result<Json<ApiResponse<RentalRate>>, AppError> {
    let rate = state.rental_service.update_rate(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        rate,
        "Rental rate updated",
    )))
}

/// Delete a rental rate
pub async fn delete_rental_rate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.rental_service.delete_rate(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Rental rate deleted",
    )))
}
