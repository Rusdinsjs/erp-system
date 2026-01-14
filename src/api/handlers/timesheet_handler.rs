//! Timesheet Handler
//!
//! HTTP handlers for rental timesheet operations.

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{
    ClientApproveTimesheetRequest, CreateClientContactRequest, CreateTimesheetRequest,
    SubmitTimesheetRequest, VerifyTimesheetRequest,
};
use crate::domain::entities::{ClientContact, RentalTimesheet, UserClaims};
use crate::shared::errors::AppResult;

/// Query parameters for listing timesheets
#[derive(Debug, Deserialize)]
pub struct ListTimesheetsQuery {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

/// Create timesheet entry (by Checker)
pub async fn create_timesheet(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(request): Json<CreateTimesheetRequest>,
) -> AppResult<(StatusCode, Json<RentalTimesheet>)> {
    let checker_id = Uuid::parse_str(&claims.sub)?;

    let timesheet = state
        .timesheet_service
        .create_timesheet(request, checker_id)
        .await?;

    Ok((StatusCode::CREATED, Json(timesheet)))
}

/// Update timesheet entry
pub async fn update_timesheet(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(request): Json<crate::application::dto::UpdateTimesheetRequest>,
) -> AppResult<Json<RentalTimesheet>> {
    let checker_id = Uuid::parse_str(&claims.sub)?;

    let timesheet = state
        .timesheet_service
        .update_timesheet(id, request, checker_id)
        .await?;

    Ok(Json(timesheet))
}

/// Get timesheet by ID
pub async fn get_timesheet(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RentalTimesheet>> {
    let timesheet = state.timesheet_service.get_by_id(id).await?;
    Ok(Json(timesheet))
}

/// List timesheets for a rental
pub async fn list_timesheets(
    State(state): State<AppState>,
    Path(rental_id): Path<Uuid>,
    Query(query): Query<ListTimesheetsQuery>,
) -> AppResult<Json<Vec<RentalTimesheet>>> {
    let timesheets = state
        .timesheet_service
        .list_by_rental(rental_id, query.start_date, query.end_date)
        .await?;
    Ok(Json(timesheets))
}

/// Submit timesheet for verification (Checker → Verifier)
pub async fn submit_timesheet(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(request): Json<SubmitTimesheetRequest>,
) -> AppResult<StatusCode> {
    let checker_id = Uuid::parse_str(&claims.sub)?;

    state
        .timesheet_service
        .submit_timesheet(id, request, checker_id)
        .await?;

    Ok(StatusCode::OK)
}

/// Verify timesheet (by Verifier)
pub async fn verify_timesheet(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(request): Json<VerifyTimesheetRequest>,
) -> AppResult<StatusCode> {
    let verifier_id = Uuid::parse_str(&claims.sub)?;

    state
        .timesheet_service
        .verify_timesheet(id, request, verifier_id)
        .await?;

    Ok(StatusCode::OK)
}

/// Client PIC approval
pub async fn client_approve_timesheet(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(request): Json<ClientApproveTimesheetRequest>,
) -> AppResult<StatusCode> {
    state
        .timesheet_service
        .client_approve_timesheet(id, request)
        .await?;

    Ok(StatusCode::OK)
}

/// Get timesheet summary for a period
#[derive(Debug, Deserialize)]
pub struct TimesheetSummaryQuery {
    pub rental_id: Uuid,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
}

pub async fn get_timesheet_summary(
    State(state): State<AppState>,
    Query(query): Query<TimesheetSummaryQuery>,
) -> AppResult<Json<crate::application::dto::TimesheetSummary>> {
    let summary = state
        .timesheet_service
        .get_summary(query.rental_id, query.start_date, query.end_date)
        .await?;
    Ok(Json(summary))
}

/// List timesheets pending verification
pub async fn list_pending_verification(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<crate::application::dto::TimesheetDetailResponse>>> {
    let timesheets = state.timesheet_service.list_pending_verification().await?;
    Ok(Json(timesheets))
}

// ==================== CLIENT CONTACT HANDLERS ====================

/// Create client contact (PIC)
pub async fn create_client_contact(
    State(state): State<AppState>,
    Json(request): Json<CreateClientContactRequest>,
) -> AppResult<(StatusCode, Json<ClientContact>)> {
    let contact = state
        .timesheet_service
        .create_client_contact(request)
        .await?;
    Ok((StatusCode::CREATED, Json(contact)))
}

/// List contacts for a client
pub async fn list_client_contacts(
    State(state): State<AppState>,
    Path(client_id): Path<Uuid>,
) -> AppResult<Json<Vec<ClientContact>>> {
    let contacts = state
        .timesheet_service
        .list_client_contacts(client_id)
        .await?;
    Ok(Json(contacts))
}
