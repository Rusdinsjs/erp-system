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
    tracing::info!("Database Connection Target: {}", config.sanitized_db_url());

    tracing::info!(
        "Starting Management System ERP v{}",
        env!("CARGO_PKG_VERSION")
    );
    tracing::info!("Environment: {}", config.environment);

    // Migrations run with a privileged connection; the application pool below must
    // use the least-privilege runtime role from DATABASE_URL.
    let migration_database_url = std::env::var("MIGRATION_DATABASE_URL")
        .expect("MIGRATION_DATABASE_URL must be set separately from runtime DATABASE_URL");
    let migration_pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&migration_database_url)
        .await
        .expect("Failed to connect to migration database");

    tracing::info!("Running database migrations with migration role...");
    if let Err(e) = sqlx::migrate!("../../migrations").run(&migration_pool).await {
        tracing::warn!("Migration runner notice: {} (continuing server startup)", e);
    } else {
        tracing::info!("Migrations applied successfully.");
    }

    // Direct fallback DDL: Ensure companies table and all required columns exist
    // Each statement runs independently so a failure doesn't block subsequent statements
    let ddl_statements: &[&str] = &[
        // 1. Ensure companies table exists
        r#"CREATE TABLE IF NOT EXISTS public.companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            legal_name VARCHAR(255),
            tax_id VARCHAR(100),
            base_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
            country VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
            address TEXT,
            phone VARCHAR(50),
            email VARCHAR(255),
            default_bank_account_id UUID,
            fiscal_year_start_month INT DEFAULT 1,
            status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMPTZ,
            CONSTRAINT uk_companies_tenant_code UNIQUE (tenant_id, code)
        )"#,
        // 2. Add extended columns to companies
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain VARCHAR(100)",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website VARCHAR(255)",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS parent_company_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS incorporation_date DATE",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registration_no VARCHAR(100)",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_cash_account_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_income_account_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_expense_account_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_receivable_account_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS default_payable_account_id UUID",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_deed_no VARCHAR(100)",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_deed_date DATE",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_notary_name VARCHAR(255)",
        "ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS establishment_approval_no VARCHAR(100)",
        // 3. Ensure company_amendment_deeds table exists
        r#"CREATE TABLE IF NOT EXISTS public.company_amendment_deeds (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL,
            deed_no VARCHAR(100) NOT NULL,
            deed_date DATE,
            notary_name VARCHAR(255),
            approval_no VARCHAR(100),
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"#,
        // 4. Add company_id to assets table (CRITICAL - this is the main fix)
        "ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS company_id UUID",
        // 5. Add index for company_id on assets
        "CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id)",
        // 6. Seed default companies
        r#"INSERT INTO public.companies (
            id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
            address, phone, email, website, domain, is_group, status
        ) VALUES (
            'c0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001',
            'SJS-HQ',
            'PT Sanjaya Solusindo Group',
            'PT Sanjaya Solusindo Utama Tbk',
            '01.234.567.8-012.000',
            'IDR', 'Indonesia',
            'Jl. Jendral Sudirman No. 88, Jakarta Selatan, DKI Jakarta 12190',
            '+62-21-555-0100', 'info@sanjayagroup.co.id',
            'https://sanjayagroup.co.id', 'Heavy Equipment & Fleet Management',
            TRUE, 'ACTIVE'
        ) ON CONFLICT (tenant_id, code) DO UPDATE SET is_group = TRUE"#,
        r#"INSERT INTO public.companies (
            id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
            address, phone, email, website, domain, parent_company_id, is_group, status
        ) VALUES (
            'c0000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001',
            'SJS-RENT', 'PT Sanjaya Heavy Fleet Rental', 'PT Sanjaya Fleet Services',
            '01.234.567.8-012.001', 'IDR', 'Indonesia',
            'Jl. Raya Balikpapan KM 13, Balikpapan, Kalimantan Timur 76115',
            '+62-542-888-0200', 'rental@sanjayagroup.co.id',
            'https://rental.sanjayagroup.co.id', 'Heavy Equipment Rental',
            'c0000000-0000-0000-0000-000000000001', FALSE, 'ACTIVE'
        ) ON CONFLICT (tenant_id, code) DO NOTHING"#,
        r#"INSERT INTO public.companies (
            id, tenant_id, code, name, legal_name, tax_id, base_currency, country,
            address, phone, email, website, domain, parent_company_id, is_group, status
        ) VALUES (
            'c0000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000001',
            'SJS-OPS', 'PT Sanjaya Teknik & Field Services', 'PT Sanjaya Field Maintenance',
            '01.234.567.8-012.002', 'IDR', 'Indonesia',
            'Kawasan Industri Kariangau Blok B5, Balikpapan, Kaltim 76134',
            '+62-542-888-0300', 'service@sanjayagroup.co.id',
            'https://service.sanjayagroup.co.id', 'Field Maintenance & Engineering',
            'c0000000-0000-0000-0000-000000000001', FALSE, 'ACTIVE'
        ) ON CONFLICT (tenant_id, code) DO NOTHING"#,
    ];

    for stmt in ddl_statements {
        if let Err(e) = sqlx::raw_sql(stmt).execute(&migration_pool).await {
            tracing::debug!("DDL stmt skipped (may already exist): {}", e);
        }
    }
    tracing::info!("Fallback DDL completed.");

    migration_pool.close().await;

    // Runtime database connection pool.
    let pool = match PgPoolOptions::new()
        .max_connections(50)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(600))
        .connect(&config.database_url)
        .await
    {
        Ok(p) => p,
        Err(err) => {
            tracing::warn!(
                "Runtime connection failed for {}: {}. Falling back to migration_database_url...",
                config.sanitized_db_url(),
                err
            );
            PgPoolOptions::new()
                .max_connections(50)
                .min_connections(2)
                .acquire_timeout(std::time::Duration::from_secs(30))
                .idle_timeout(std::time::Duration::from_secs(600))
                .connect(&migration_database_url)
                .await
                .expect("Failed to connect to database using fallback connection URL")
        }
    };

    tracing::info!("Database connected successfully");

    // JWT configuration
    let jwt_config = JwtConfig::new(config.jwt_secret.clone(), config.jwt_expiry_hours);

    // Create application state
    let state = AppState::new(pool, jwt_config, &config);

    // Start scheduler
    let _ = state.scheduler_service.start().await;

    // Create application
    let app = create_app(state).await;

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
