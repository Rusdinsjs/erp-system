//! Company Routes - ERPNext/Frappe Framework Company Module

use axum::{routing::get, Router};
use crate::api::handlers::company_handler;
use crate::api::server::AppState;

pub fn company_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/companies",
            get(company_handler::list_companies).post(company_handler::create_company),
        )
        .route(
            "/api/companies/tree",
            get(company_handler::get_company_tree),
        )
        .route(
            "/api/companies/:id",
            get(company_handler::get_company)
                .put(company_handler::update_company)
                .delete(company_handler::delete_company),
        )
}
