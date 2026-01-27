use crate::api::handlers::maintenance_handler;
use crate::api::AppState;
use axum::{routing::post, Router};

pub fn maintenance_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/schedules",
            post(maintenance_handler::create_schedule).get(maintenance_handler::list_schedules),
        )
        .route(
            "/schedules/:id/run",
            post(maintenance_handler::run_schedule),
        )
}
