use crate::api::handlers::inventory_handler;
use crate::api::server::AppState;
use axum::{
    routing::{get, post},
    Router,
};

pub fn inventory_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/categories",
            get(inventory_handler::list_inventory_categories)
                .post(inventory_handler::create_inventory_category),
        )
        .route(
            "/items",
            get(inventory_handler::list_items).post(inventory_handler::create_item),
        )
        .route("/items/:id/adjust", post(inventory_handler::adjust_stock))
        .route("/adjust/batch", post(inventory_handler::batch_adjust_stock))
}
