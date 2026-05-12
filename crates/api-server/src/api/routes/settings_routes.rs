use crate::api::handlers::settings_handler;
use crate::api::middleware::rbac::admin_only_middleware;
use crate::api::server::AppState;
use axum::middleware as axum_middleware;
use axum::{
    routing::{get, put},
    Router,
};

pub fn settings_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/public-settings",
            get(settings_handler::get_public_settings),
        )
        .route(
            "/api/settings",
            get(settings_handler::get_all_settings)
                .layer(axum_middleware::from_fn(admin_only_middleware)),
        )
        .route(
            "/api/settings/:key",
            put(settings_handler::update_setting)
                .layer(axum_middleware::from_fn(admin_only_middleware)),
        )
}
