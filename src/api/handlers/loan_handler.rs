//! Loan Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, CreateLoanRequest, PaginationParams};
use crate::domain::entities::{Loan, UserClaims};
use crate::shared::errors::AppError;

pub async fn list_loans(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Loan>>, AppError> {
    let loans = state
        .loan_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(loans))
}

pub async fn get_loan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Loan>, AppError> {
    let loan = state.loan_service.get_by_id(id).await?;
    Ok(Json(loan))
}

pub async fn create_loan(
    State(state): State<AppState>,
    Json(payload): Json<CreateLoanRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Loan>>), AppError> {
    let loan = state.loan_service.create(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(loan, "Loan created")),
    ))
}

pub async fn approve_loan(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Loan>>, AppError> {
    let approver_id = claims.user_id();
    let loan = state.loan_service.approve(id, approver_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        loan,
        "Loan approved",
    )))
}

pub async fn list_overdue_loans(
    State(state): State<AppState>,
) -> Result<Json<Vec<Loan>>, AppError> {
    let loans = state.loan_service.list_overdue().await?;
    Ok(Json(loans))
}

#[derive(serde::Deserialize)]
pub struct CheckoutRequest {
    pub condition: String,
}

#[derive(serde::Deserialize)]
pub struct RejectRequest {
    pub reason: Option<String>,
}

pub async fn checkout_loan(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CheckoutRequest>,
) -> Result<Json<ApiResponse<Loan>>, AppError> {
    let checked_out_by = claims.user_id();
    let loan = state
        .loan_service
        .checkout(id, checked_out_by, &payload.condition)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        loan,
        "Asset checked out",
    )))
}

pub async fn checkin_loan(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CheckoutRequest>,
) -> Result<Json<ApiResponse<Loan>>, AppError> {
    let checked_in_by = claims.user_id();
    let loan = state
        .loan_service
        .checkin(id, checked_in_by, &payload.condition)
        .await?;
    Ok(Json(ApiResponse::success_with_message(
        loan,
        "Asset returned",
    )))
}

pub async fn reject_loan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRequest>,
) -> Result<Json<ApiResponse<Loan>>, AppError> {
    let loan = state.loan_service.reject(id, payload.reason).await?;
    Ok(Json(ApiResponse::success_with_message(
        loan,
        "Loan rejected",
    )))
}

pub async fn list_my_loans(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<Vec<Loan>>, AppError> {
    let loans = state.loan_service.list_by_user(user_id).await?;
    Ok(Json(loans))
}
