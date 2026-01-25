//! Asset Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::AssetDocumentResponse;
use crate::application::dto::{
    ApiResponse, AssetSearchParams, BulkCreateAssetRequest, CreateAssetDocumentRequest,
    CreateAssetRequest, PaginatedResponse, PaginationParams, UpdateAssetRequest,
};
use crate::application::services::asset_service::AssetOperationResult;

use crate::domain::entities::user::UserClaims;
use crate::domain::entities::{Asset, AssetSummary};
use crate::shared::errors::AppError;
use axum::{extract::Extension, response::IntoResponse};

#[utoipa::path(
    get,
    path = "/api/assets",
    params(AssetSearchParams),
    responses(
        (status = 200, description = "List assets", body = PaginatedResponse<AssetSummary>),
        (status = 400, description = "Bad Request")
    ),
    tag = "assets"
)]
pub async fn list_assets(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<AssetSummary>>, AppError> {
    let department_filter = if claims.role == "super_admin" {
        None
    } else {
        claims.department.as_deref()
    };

    let result = state
        .asset_service
        .list(params.page(), params.per_page(), department_filter)
        .await?;
    Ok(Json(result))
}

#[utoipa::path(
    get,
    path = "/api/assets/search",
    params(AssetSearchParams),
    responses(
        (status = 200, description = "Search assets", body = PaginatedResponse<AssetSummary>),
        (status = 400, description = "Bad Request")
    ),
    tag = "assets"
)]
pub async fn search_assets(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Query(mut params): Query<AssetSearchParams>,
) -> Result<Json<PaginatedResponse<AssetSummary>>, AppError> {
    if claims.role != "super_admin" {
        if let Some(dept) = &claims.department {
            params.department = Some(dept.clone());
        }
    }
    let result = state.asset_service.search(params).await?;
    Ok(Json(result))
}

#[utoipa::path(
    get,
    path = "/api/assets/{id}",
    params(
        ("id" = Uuid, Path, description = "Asset ID")
    ),
    responses(
        (status = 200, description = "Asset details", body = crate::domain::entities::asset::AssetDetail),
        (status = 404, description = "Asset not found")
    ),
    tag = "assets"
)]
pub async fn get_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<crate::domain::entities::asset::AssetDetail>, AppError> {
    let asset = state.asset_service.get_detail_by_id(id).await?;
    Ok(Json(asset))
}

#[utoipa::path(
    post,
    path = "/api/assets",
    request_body = CreateAssetRequest,
    responses(
        (status = 201, description = "Asset created", body = ApiResponse<Asset>),
        (status = 202, description = "Approval pending", body = ApiResponse<crate::infrastructure::repositories::approval_repository::ApprovalRequest>),
        (status = 400, description = "Bad Request")
    ),
    tag = "assets"
)]
pub async fn create_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(mut payload): Json<CreateAssetRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Enforce department for restricted users
    if claims.role != "super_admin" {
        if let Some(dept) = &claims.department {
            payload.department = Some(dept.clone());
        }
    }

    // Parse user_id from subject
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let result = state
        .asset_service
        .create(payload, user_id, claims.role_level)
        .await?;

    match result {
        AssetOperationResult::Success(asset) => Ok((
            StatusCode::CREATED,
            Json(ApiResponse::success_with_message(asset, "Asset created")),
        )
            .into_response()),
        AssetOperationResult::PendingApproval(request) => Ok((
            StatusCode::ACCEPTED,
            Json(ApiResponse::success_with_message(
                request,
                "Approval request submitted",
            )),
        )
            .into_response()),
    }
}

pub async fn bulk_create_assets(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<BulkCreateAssetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let results = state
        .asset_service
        .bulk_create(payload, user_id, claims.role_level)
        .await?;

    Ok((
        StatusCode::OK,
        Json(ApiResponse::success_with_message(
            results.len(),
            "Assets processed",
        )),
    )
        .into_response())
}

#[utoipa::path(
    put,
    path = "/api/assets/{id}",
    params(
        ("id" = Uuid, Path, description = "Asset ID")
    ),
    request_body = UpdateAssetRequest,
    responses(
        (status = 200, description = "Asset updated", body = ApiResponse<Asset>),
        (status = 404, description = "Asset not found")
    ),
    tag = "assets"
)]
pub async fn update_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateAssetRequest>,
) -> Result<Json<ApiResponse<Asset>>, AppError> {
    let asset = state.asset_service.update(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        asset,
        "Asset updated",
    )))
}

#[utoipa::path(
    delete,
    path = "/api/assets/{id}",
    params(
        ("id" = Uuid, Path, description = "Asset ID")
    ),
    responses(
        (status = 200, description = "Asset archived", body = ApiResponse<()>),
        (status = 404, description = "Asset not found")
    ),
    tag = "assets"
)]
pub async fn delete_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.asset_service.delete(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Asset archived",
    )))
}

#[utoipa::path(
    post,
    path = "/api/assets/{id}/documents",
    params(
        ("id" = Uuid, Path, description = "Asset ID")
    ),
    request_body = CreateAssetDocumentRequest,
    responses(
        (status = 201, description = "Document added", body = ApiResponse<AssetDocumentResponse>),
        (status = 404, description = "Asset not found")
    ),
    tag = "assets"
)]
pub async fn add_document_to_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateAssetDocumentRequest>,
) -> Result<Json<ApiResponse<AssetDocumentResponse>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let doc = state
        .asset_service
        .add_document(id, payload, Some(user_id))
        .await?;

    let response = AssetDocumentResponse {
        id: doc.id,
        asset_id: doc.asset_id,
        name: doc.name,
        type_: doc.type_,
        file_path: doc.file_path,
        mime_type: doc.mime_type,
        size_bytes: doc.size_bytes,
        expiry_date: doc.expiry_date,
        notes: doc.notes,
        uploaded_by: doc.uploaded_by,
        created_at: doc.created_at,
    };

    Ok(Json(ApiResponse::success_with_message(
        response,
        "Document added",
    )))
}

#[utoipa::path(
    get,
    path = "/api/assets/{id}/documents",
    params(
        ("id" = Uuid, Path, description = "Asset ID")
    ),
    responses(
        (status = 200, description = "List documents", body = Vec<AssetDocumentResponse>),
        (status = 404, description = "Asset not found")
    ),
    tag = "assets"
)]
pub async fn get_asset_documents(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<AssetDocumentResponse>>, AppError> {
    let docs = state.asset_service.get_documents(id).await?;

    let response: Vec<AssetDocumentResponse> = docs
        .into_iter()
        .map(|doc| AssetDocumentResponse {
            id: doc.id,
            asset_id: doc.asset_id,
            name: doc.name,
            type_: doc.type_,
            file_path: doc.file_path,
            mime_type: doc.mime_type,
            size_bytes: doc.size_bytes,
            expiry_date: doc.expiry_date,
            notes: doc.notes,
            uploaded_by: doc.uploaded_by,
            created_at: doc.created_at,
        })
        .collect();

    Ok(Json(response))
}
