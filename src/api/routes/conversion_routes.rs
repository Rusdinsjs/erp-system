use crate::api::handlers::conversion_handler;
use crate::api::middleware::rbac::require_permission;
use crate::api::server::AppState;
use axum::{
    handler::Handler,
    middleware as axum_middleware,
    routing::{get, post, put},
    Router,
};

pub fn conversion_routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/api/assets/:asset_id/conversion-requests",
            post(
                conversion_handler::create_conversion_request
                    .layer(axum_middleware::from_fn(require_permission("asset.update"))),
            )
            .get(
                conversion_handler::get_asset_conversions
                    .layer(axum_middleware::from_fn(require_permission("asset.read"))),
            ),
        )
        .route(
            "/api/conversion-requests/pending",
            get(conversion_handler::get_pending_conversions
                .layer(axum_middleware::from_fn(require_permission("asset.read")))),
        )
        .route(
            "/api/conversion-requests/:id/approve",
            put(
                conversion_handler::approve_conversion.layer(axum_middleware::from_fn(
                    require_permission("approval.write"),
                )), // Assuming generic approval permission or specific one
            ),
        )
        .route(
            "/api/conversion-requests/:id/execute",
            post(
                conversion_handler::execute_conversion
                    .layer(axum_middleware::from_fn(require_permission("asset.update"))),
            ),
        )
        .route(
            "/api/conversion-requests/:id",
            get(conversion_handler::get_conversion
                .layer(axum_middleware::from_fn(require_permission("asset.read")))),
        )
        .route(
            "/api/conversion-requests/:id/reject",
            put(
                conversion_handler::reject_conversion.layer(axum_middleware::from_fn(
                    require_permission("approval.write"),
                )),
            ),
        )
}
