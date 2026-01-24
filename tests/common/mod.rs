use management_system::shared::config::AppConfig;
use sqlx::PgPool;
use std::sync::Once;

static INIT: Once = Once::new();

pub async fn setup() -> PgPool {
    INIT.call_once(|| {
        dotenvy::dotenv().ok();
        tracing_subscriber::fmt::init();
    });

    let config = AppConfig::from_env();

    // In a real scenario, you might want to create a separate test database
    // For now, we connect to the configured database (dev)
    // WARNING: This runs against the dev DB.

    sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .expect("Failed to create test pool")
}
