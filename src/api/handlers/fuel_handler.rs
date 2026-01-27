//! Fuel Handler

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Extension, Json,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::{responses::ApiResponse, server::AppState};
use crate::domain::entities::UserClaims;

#[derive(Deserialize)]
pub struct CreateFuelRequest {
    pub asset_id: Uuid,
    pub odometer_reading: Decimal,
    pub odometer_image_url: String,
    pub request_type: String,
    pub requested_value: Decimal,
    pub driver_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct FuelLogResponse {
    pub id: Uuid,
    pub tracking_number: String,
    pub status: String,
    pub coupon_code: Option<String>,
}

use axum::http::StatusCode;

pub async fn request_fuel(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateFuelRequest>,
) -> impl IntoResponse {
    match state
        .fuel_service
        .request_fuel(crate::application::services::FuelRequest {
            asset_id: payload.asset_id,
            requested_by: claims.user_id(),
            odometer_reading: payload.odometer_reading,
            odometer_image_url: payload.odometer_image_url,
            request_type: payload.request_type,
            requested_value: payload.requested_value,
            driver_id: payload.driver_id,
        })
        .await
    {
        Ok(log) => (StatusCode::OK, Json(ApiResponse::success(log))).into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

pub async fn list_pending_fuel(State(state): State<AppState>) -> impl IntoResponse {
    match state.fuel_service.get_pending_requests().await {
        Ok(logs) => (StatusCode::OK, Json(ApiResponse::success(logs))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct ListFuelQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn list_fuel_history(
    State(state): State<AppState>,
    Query(query): Query<ListFuelQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(20);
    let offset = (query.page.unwrap_or(1) - 1) * limit;

    match state.fuel_service.get_history(limit, offset).await {
        Ok(logs) => (StatusCode::OK, Json(ApiResponse::success(logs))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

pub async fn approve_fuel(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state
        .fuel_service
        .approve_request(id, claims.user_id())
        .await
    {
        Ok(code) => (StatusCode::OK, Json(ApiResponse::success(code))).into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct RejectFuelRequest {
    pub reason: String,
}

pub async fn reject_fuel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectFuelRequest>,
) -> impl IntoResponse {
    match state.fuel_service.reject_request(id, &payload.reason).await {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success("Request rejected")),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

#[derive(Deserialize)]
pub struct CompleteFuelRequest {
    pub actual_filled_amount: Decimal,
    pub actual_volume: Option<Decimal>,
    pub receipt_image_url: String,
}

pub async fn complete_fuel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CompleteFuelRequest>,
) -> impl IntoResponse {
    match state
        .fuel_service
        .complete_transaction(
            id,
            payload.actual_filled_amount,
            payload.actual_volume,
            &payload.receipt_image_url,
        )
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success("Fuel transaction completed")),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}
#[derive(Serialize)]
pub struct FuelStatsResponse {
    pub requested: i64,
    pub approved: i64,
    pub completed: i64,
    pub rejected: i64,
}

pub async fn get_fuel_stats(State(state): State<AppState>) -> impl IntoResponse {
    match state.fuel_service.get_dashboard_stats().await {
        Ok(stats) => {
            let mut response = FuelStatsResponse {
                requested: 0,
                approved: 0,
                completed: 0,
                rejected: 0,
            };

            for (status, count) in stats {
                match status.as_str() {
                    "requested" => response.requested = count,
                    "approved" => response.approved = count,
                    "completed" => response.completed = count,
                    "rejected" => response.rejected = count,
                    _ => {}
                }
            }

            (StatusCode::OK, Json(ApiResponse::success(response))).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}
pub async fn list_my_fuel(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
) -> impl IntoResponse {
    match state.fuel_service.get_my_requests(claims.user_id()).await {
        Ok(logs) => (StatusCode::OK, Json(ApiResponse::success(logs))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}

pub async fn get_fuel_analytics(State(state): State<AppState>) -> impl IntoResponse {
    match state.fuel_service.get_analytics().await {
        Ok(data) => (StatusCode::OK, Json(ApiResponse::success(data))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<()>::error(&e.to_string())),
        )
            .into_response(),
    }
}
