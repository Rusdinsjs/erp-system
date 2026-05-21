use axum::{
    routing::{get, put},
    Router,
    middleware as axum_middleware,
};
use crate::api::middleware::rbac::require_permission;

use crate::api::handlers::tax_renewal_handler;
use crate::api::server::AppState;

pub fn tax_renewal_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/tax-renewals",
            get(tax_renewal_handler::list_renewals)
                .layer(axum_middleware::from_fn(require_permission("asset.read"))),
        )
        .route(
            "/api/tax-renewals/:id/cost",
            put(tax_renewal_handler::submit_cost)
                .layer(axum_middleware::from_fn(require_permission("asset.update"))),
        )
        .route(
            "/api/tax-renewals/:id/approve",
            put(tax_renewal_handler::approve_renewal)
                .layer(axum_middleware::from_fn(require_permission("asset.update"))),
        )
        .route(
            "/api/tax-renewals/:id/reject",
            put(tax_renewal_handler::reject_renewal)
                .layer(axum_middleware::from_fn(require_permission("asset.update"))),
        )
        .route(
            "/api/tax-renewals/:id/complete",
            put(tax_renewal_handler::complete_renewal)
                .layer(axum_middleware::from_fn(require_permission("asset.update"))),
        )
}
