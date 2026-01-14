//! Management System ERP Backend Server
//!
//! Entry point for the integrated management system (Asset, HRD, Finance, Inventory).

use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use management_system::api::{create_app, AppState};
use management_system::shared::config::AppConfig;
use management_system::shared::utils::jwt::JwtConfig;

#[tokio::main]
async fn main() {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "management_system=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = AppConfig::from_env();

    tracing::info!(
        "Starting Management System ERP v{}",
        env!("CARGO_PKG_VERSION")
    );
    tracing::info!("Environment: {}", config.environment);

    // Database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    tracing::info!("Database connected successfully");

    // Run migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations applied successfully.");

    // JWT configuration
    let jwt_config = JwtConfig::new(config.jwt_secret.clone(), config.jwt_expiry_hours);

    // Create application state
    let state = AppState::new(pool, jwt_config);

    // Start scheduler
    let _ = state.scheduler_service.start().await;

    // Create application
    let app = create_app(state);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port)
        .parse()
        .expect("Invalid server address");

    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app).await.expect("Server error");
}
