use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::journal::{
    CreateJournalEntryRequest, JournalEntry, JournalEntryDetail,
};
use management_system_core::domain::entities::user::UserClaims;
use management_system_core::shared::errors::AppResult;

#[derive(Deserialize)]
pub struct ListParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn list_journals(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<Vec<JournalEntry>>> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    let entries = state.journal_service.list(limit, offset).await?;
    Ok(Json(entries))
}

pub async fn get_journal_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<JournalEntryDetail>> {
    let entry = state.journal_service.get_details(id).await?;
    Ok(Json(entry))
}

pub async fn create_journal(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(req): Json<CreateJournalEntryRequest>,
) -> AppResult<Json<JournalEntryDetail>> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let entry = state.journal_service.create_entry(req, user_id).await?;
    Ok(Json(entry))
}
