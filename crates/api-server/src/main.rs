//! Management System ERP Backend Server
//!
//! Entry point for the integrated management system (Asset, HRD, Finance, Inventory).

use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod application;

use api::{create_app, AppState};
use management_system_core::shared::config::AppConfig;
use management_system_core::shared::utils::jwt::JwtConfig;

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
    tracing::info!("DEBUG: Database Config URL: {}", config.database_url); // Warning: prints secrets in dev, ok for local debug

    tracing::info!(
        "Starting Management System ERP v{}",
        env!("CARGO_PKG_VERSION")
    );
    tracing::info!("Environment: {}", config.environment);

    // Database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .min_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(600))
        .connect(&config.database_url)
        .await
        .unwrap_or_else(|_| panic!("Failed to connect to database at {}", config.database_url));

    tracing::info!("Database connected successfully");

    // Run migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations applied successfully.");

    // JWT configuration
    let jwt_config = JwtConfig::new(config.jwt_secret.clone(), config.jwt_expiry_hours);

    // Create application state
    let state = AppState::new(pool, jwt_config, &config);

    // Start scheduler
    let _ = state.scheduler_service.start().await;

    // Create application
    let app = create_app(state);

    // Start server
    let addr_str = format!("{}:{}", config.server_host, config.server_port);
    let addr: SocketAddr = addr_str
        .parse()
        .unwrap_or_else(|_| panic!("Invalid server address: {}", addr_str));

    // Force rebuild for migrations
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|_| panic!("Failed to bind to address: {}", addr));

    tracing::info!("Server listening on http://{}", addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .expect("Server error during execution");
}
