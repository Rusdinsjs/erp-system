use axum::{
    extract::{Multipart, Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::contract_dto::{
    ApprovalRequest, BulkApprovalRequest, ContractDocumentResponse, CreateContractRequest,
    DelegateApprovalRequest, RenewalRequest, UpdateContractRequest,
};
use crate::domain::entities::{ContractDocument, UserClaims};
use axum::Extension;

#[derive(Debug, Deserialize)]
pub struct ListContractsQuery {
    pub client_id: Option<Uuid>,
    pub expiring_soon: Option<bool>,
}

/// Create a new contract
pub async fn create_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateContractRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .create_contract(payload, claims.user_id())
        .await
    {
        Ok(contract) => (StatusCode::CREATED, Json(contract)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Get contract by ID
pub async fn get_contract(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.contract_service.get_contract(id).await {
        Ok(contract) => Json(contract).into_response(),
        Err(e) => (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

/// List contracts
pub async fn list_contracts(
    State(state): State<AppState>,
    Query(query): Query<ListContractsQuery>,
) -> impl IntoResponse {
    let result = if query.expiring_soon.unwrap_or(false) {
        state.contract_service.list_expiring().await
    } else {
        state.contract_service.list_contracts().await
    };

    match result {
        Ok(contracts) => Json(contracts).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Get count of contracts pending approval
pub async fn get_pending_approvals_count(State(state): State<AppState>) -> impl IntoResponse {
    match state.contract_service.get_pending_approvals_count().await {
        Ok(count) => Json(serde_json::json!({ "count": count })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Update contract
pub async fn update_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContractRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .update_contract(id, payload, claims.user_id())
        .await
    {
        Ok(contract) => Json(contract).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Upload contract document
pub async fn upload_document(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(contract_id): Path<Uuid>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;
    let mut document_type = String::from("contract");
    let mut notes: Option<String> = None;

    // Parse multipart form
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                file_data = field.bytes().await.ok().map(|b| b.to_vec());
            }
            "document_type" => {
                if let Ok(text) = field.text().await {
                    document_type = text;
                }
            }
            "notes" => {
                if let Ok(text) = field.text().await {
                    notes = Some(text);
                }
            }
            _ => {}
        }
    }

    let file_data = match file_data {
        Some(data) => data,
        None => return (StatusCode::BAD_REQUEST, "No file uploaded").into_response(),
    };

    let file_name = match file_name {
        Some(name) => name,
        None => return (StatusCode::BAD_REQUEST, "No filename").into_response(),
    };

    // Determine mime type
    let mime_type = mime_guess::from_path(&file_name)
        .first_or_octet_stream()
        .to_string();

    // Save file
    let file_path = match state
        .file_storage
        .save_file(file_data.clone(), &file_name, "contracts")
        .await
    {
        Ok(path) => path,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Get next version
    let version = match state
        .contract_document_repo
        .get_next_version(contract_id, &document_type)
        .await
    {
        Ok(v) => v,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Deactivate previous versions
    if let Err(e) = state
        .contract_document_repo
        .deactivate_previous_versions(contract_id, &document_type)
        .await
    {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }

    // Create document record
    let document = ContractDocument::new(crate::domain::entities::CreateContractDocumentRequest {
        contract_id,
        document_type,
        file_name,
        file_path,
        file_size: file_data.len() as i64,
        mime_type,
        version,
        uploaded_by: claims.user_id(),
        notes,
    });

    match state.contract_document_repo.create(&document).await {
        Ok(doc) => {
            let response = ContractDocumentResponse {
                id: doc.id,
                contract_id: doc.contract_id,
                document_type: doc.document_type,
                file_name: doc.file_name,
                file_size: doc.file_size,
                mime_type: doc.mime_type,
                version: doc.version,
                is_active: doc.is_active,
                notes: doc.notes,
                uploaded_by: doc.uploaded_by,
                uploaded_at: doc.uploaded_at,
            };
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// List contract documents
pub async fn list_documents(
    State(state): State<AppState>,
    Path(contract_id): Path<Uuid>,
) -> impl IntoResponse {
    match state
        .contract_document_repo
        .find_active_by_contract_id(contract_id)
        .await
    {
        Ok(docs) => {
            let responses: Vec<ContractDocumentResponse> = docs
                .into_iter()
                .map(|doc| ContractDocumentResponse {
                    id: doc.id,
                    contract_id: doc.contract_id,
                    document_type: doc.document_type,
                    file_name: doc.file_name,
                    file_size: doc.file_size,
                    mime_type: doc.mime_type,
                    version: doc.version,
                    is_active: doc.is_active,
                    notes: doc.notes,
                    uploaded_by: doc.uploaded_by,
                    uploaded_at: doc.uploaded_at,
                })
                .collect();
            Json(responses).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Download contract document
pub async fn download_document(
    State(state): State<AppState>,
    Path(document_id): Path<Uuid>,
) -> impl IntoResponse {
    // Get document metadata
    let document = match state.contract_document_repo.find_by_id(document_id).await {
        Ok(Some(doc)) => doc,
        Ok(None) => return (StatusCode::NOT_FOUND, "Document not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Read file
    let file_data = match state.file_storage.read_file(&document.file_path).await {
        Ok(data) => data,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Return file with appropriate headers
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, document.mime_type.as_str()),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", document.file_name),
            ),
        ],
        file_data,
    )
        .into_response()
}

/// Delete contract document
pub async fn delete_document(
    State(state): State<AppState>,
    Path(document_id): Path<Uuid>,
) -> impl IntoResponse {
    // Get document to get file path
    let document = match state.contract_document_repo.find_by_id(document_id).await {
        Ok(Some(doc)) => doc,
        Ok(None) => return (StatusCode::NOT_FOUND, "Document not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Delete file from storage
    if let Err(e) = state.file_storage.delete_file(&document.file_path).await {
        eprintln!("Failed to delete file: {}", e);
        // Continue anyway to delete DB record
    }

    // Delete from database
    match state.contract_document_repo.delete(document_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ===== Approval Workflow Handlers =====

/// Submit contract for approval
pub async fn submit_for_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state
        .contract_service
        .submit_for_approval(id, claims.user_id())
        .await
    {
        Ok(contract) => (StatusCode::OK, Json(contract)).into_response(),
        Err(e) => e.into_response(),
    }
}

/// Approve contract
pub async fn approve_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .approve_contract(id, claims.user_id(), payload.notes)
        .await
    {
        Ok(contract) => (StatusCode::OK, Json(contract)).into_response(),
        Err(e) => e.into_response(),
    }
}

/// Reject contract
pub async fn reject_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApprovalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .reject_contract(id, claims.user_id(), payload.notes)
        .await
    {
        Ok(contract) => (StatusCode::OK, Json(contract)).into_response(),
        Err(e) => e.into_response(),
    }
}

/// Bulk approve contracts
pub async fn bulk_approve_contracts(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<BulkApprovalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .bulk_approve(payload.ids, claims.user_id(), payload.notes)
        .await
    {
        Ok(contracts) => (StatusCode::OK, Json(contracts)).into_response(),
        Err(e) => e.into_response(),
    }
}

/// Bulk reject contracts
pub async fn bulk_reject_contracts(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<BulkApprovalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .bulk_reject(payload.ids, claims.user_id(), payload.notes)
        .await
    {
        Ok(contracts) => (StatusCode::OK, Json(contracts)).into_response(),
        Err(e) => e.into_response(),
    }
}

/// Delegate approval to another user
pub async fn delegate_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<DelegateApprovalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .delegate_approval(id, claims.user_id(), payload)
        .await
    {
        Ok(contract) => (StatusCode::OK, Json(contract)).into_response(),
        Err(e) => e.into_response(),
    }
}
// / Get approval history for a contract
pub async fn get_approval_history(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.contract_service.get_approval_history(id).await {
        Ok(history) => Json(history).into_response(),
        Err(e) => e.into_response(),
    }
}

// ===== Renewal Handlers =====

// / Get renewal options for a contract
pub async fn get_renewal_options(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.contract_service.get_renewal_options(id).await {
        Ok(options) => Json(options).into_response(),
        Err(e) => e.into_response(),
    }
}

// / Renew a contract
pub async fn renew_contract(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RenewalRequest>,
) -> impl IntoResponse {
    match state
        .contract_service
        .renew_contract(id, payload, claims.user_id())
        .await
    {
        Ok(renewal) => (StatusCode::CREATED, Json(renewal)).into_response(),
        Err(e) => e.into_response(),
    }
}

// / List renewals for a contract
pub async fn list_renewals(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match state.contract_service.list_renewals(id).await {
        Ok(renewals) => Json(renewals).into_response(),
        Err(e) => e.into_response(),
    }
}
