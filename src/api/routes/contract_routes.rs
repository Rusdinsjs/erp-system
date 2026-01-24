use crate::api::handlers::{
    approval_workflow_handler, contract_handler, contract_template_handler,
};
use crate::api::server::AppState;
use axum::{
    routing::{delete, get, patch, post},
    Router,
};

pub fn contract_routes() -> Router<AppState> {
    Router::new()
        .route("/api/contracts", post(contract_handler::create_contract))
        .route("/api/contracts", get(contract_handler::list_contracts))
        .route(
            "/api/contracts/bulk-approve",
            post(contract_handler::bulk_approve_contracts),
        )
        .route(
            "/api/contracts/bulk-reject",
            post(contract_handler::bulk_reject_contracts),
        )
        .route(
            "/api/contracts/pending-count",
            get(contract_handler::get_pending_approvals_count),
        )
        .route("/api/contracts/:id", get(contract_handler::get_contract))
        .route(
            "/api/contracts/:id",
            patch(contract_handler::update_contract),
        )
        // Document routes
        .route(
            "/api/contracts/:id/documents",
            post(contract_handler::upload_document),
        )
        .route(
            "/api/contracts/:id/documents",
            get(contract_handler::list_documents),
        )
        .route(
            "/api/contracts/documents/:document_id/download",
            get(contract_handler::download_document),
        )
        .route(
            "/api/contracts/documents/:document_id",
            delete(contract_handler::delete_document),
        )
        // Approval routes
        .route(
            "/api/contracts/:id/submit-approval",
            post(contract_handler::submit_for_approval),
        )
        .route(
            "/api/contracts/:id/approve",
            post(contract_handler::approve_contract),
        )
        .route(
            "/api/contracts/:id/reject",
            post(contract_handler::reject_contract),
        )
        .route(
            "/api/contracts/:id/delegate",
            post(contract_handler::delegate_approval),
        )
        .route(
            "/api/contracts/:id/approval-history",
            get(contract_handler::get_approval_history),
        )
        // Renewal routes
        .route(
            "/api/contracts/:id/renewal-options",
            get(contract_handler::get_renewal_options),
        )
        .route(
            "/api/contracts/:id/renew",
            post(contract_handler::renew_contract),
        )
        .route(
            "/api/contracts/:id/renewals",
            get(contract_handler::list_renewals),
        )
        // Template routes
        .route(
            "/api/contracts/templates",
            post(contract_template_handler::create_template),
        )
        .route(
            "/api/contracts/templates",
            get(contract_template_handler::list_templates),
        )
        .route(
            "/api/contracts/templates/:id",
            get(contract_template_handler::get_template),
        )
        .route(
            "/api/contracts/templates/:id",
            patch(contract_template_handler::update_template),
        )
        .route(
            "/api/contracts/templates/:id",
            delete(contract_template_handler::delete_template),
        )
        // Approval Workflow routes
        .route(
            "/api/approval-workflows",
            get(approval_workflow_handler::list_workflows),
        )
        .route(
            "/api/approval-workflows",
            post(approval_workflow_handler::create_workflow),
        )
        .route(
            "/api/approval-workflows/:id",
            get(approval_workflow_handler::get_workflow),
        )
        .route(
            "/api/approval-workflows/:id",
            patch(approval_workflow_handler::update_workflow),
        )
        .route(
            "/api/approval-workflows/:id",
            delete(approval_workflow_handler::delete_workflow),
        )
}
