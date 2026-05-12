use crate::api::server::AppState;
use crate::application::dto::{
    ContractTemplateResponse, CreateContractTemplateRequest, UpdateContractTemplateRequest,
};
use crate::domain::errors::DomainResult;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn create_template(
    State(state): State<AppState>,
    Json(req): Json<CreateContractTemplateRequest>,
) -> DomainResult<Json<ContractTemplateResponse>> {
    let result = state.contract_template_service.create_template(req).await?;
    Ok(Json(result))
}

pub async fn get_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> DomainResult<Json<ContractTemplateResponse>> {
    let result = state.contract_template_service.get_template(id).await?;
    Ok(Json(result))
}

pub async fn list_templates(
    State(state): State<AppState>,
) -> DomainResult<Json<Vec<ContractTemplateResponse>>> {
    let result = state.contract_template_service.get_all_templates().await?;
    Ok(Json(result))
}

pub async fn update_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateContractTemplateRequest>,
) -> DomainResult<Json<ContractTemplateResponse>> {
    let result = state
        .contract_template_service
        .update_template(id, req)
        .await?;
    Ok(Json(result))
}

pub async fn delete_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> DomainResult<Json<()>> {
    state.contract_template_service.delete_template(id).await?;
    Ok(Json(()))
}
