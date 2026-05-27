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

    // Database connection pool — with retry logic (exponential backoff)
    // This handles the case where postgres is temporarily unavailable on startup
    let pool = {
        let max_retries = 10u32;
        let mut attempt = 0u32;
        let mut last_err = String::new();

        loop {
            attempt += 1;
            match PgPoolOptions::new()
                .max_connections(50)
                .min_connections(2)
                .acquire_timeout(std::time::Duration::from_secs(10))
                .idle_timeout(std::time::Duration::from_secs(60))
                .max_lifetime(std::time::Duration::from_secs(300))
                .test_before_acquire(true)
                .connect(&config.database_url)
                .await
            {
                Ok(pool) => {
                    tracing::info!("Database connected successfully (attempt {}/{})", attempt, max_retries);
                    break pool;
                }
                Err(e) => {
                    last_err = e.to_string();
                    if attempt >= max_retries {
                        panic!(
                            "Failed to connect to database after {} attempts. Last error: {}",
                            max_retries, last_err
                        );
                    }
                    let wait_secs = std::cmp::min(2u64.pow(attempt - 1), 30);
                    tracing::warn!(
                        "DB connection failed (attempt {}/{}): {}. Retrying in {}s...",
                        attempt, max_retries, last_err, wait_secs
                    );
                    tokio::time::sleep(std::time::Duration::from_secs(wait_secs)).await;
                }
            }
        }
    };

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

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .expect("Server error during execution");
}
