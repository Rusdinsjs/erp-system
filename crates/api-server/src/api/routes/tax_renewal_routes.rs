use axum::{
    routing::{get, put},
    Router,
};

use crate::api::handlers::tax_renewal_handler;
use crate::api::server::AppState;

pub fn tax_renewal_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/tax-renewals", get(tax_renewal_handler::list_renewals))
        .route(
            "/api/tax-renewals/:id/cost",
            put(tax_renewal_handler::submit_cost),
        )
        .route(
            "/api/tax-renewals/:id/approve",
            put(tax_renewal_handler::approve_renewal),
        )
        .route(
            "/api/tax-renewals/:id/reject",
            put(tax_renewal_handler::reject_renewal),
        )
        .route(
            "/api/tax-renewals/:id/complete",
            put(tax_renewal_handler::complete_renewal),
        )
        .with_state(state)
}
