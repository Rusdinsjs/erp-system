//! Server Configuration

use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use utoipa::OpenApi;

// use crate::api::middleware::security_headers::security_headers_middleware;
use crate::api::routes::create_router;
use crate::application::services::{
    AnalyticsService,
    ApprovalService,
    AssetExpenseService, // Added
    AssetService,
    AuditService,
    AuthService,
    BillingService,
    CategoryService,
    CategoryTemplateService,
    ClientService,
    ContractService,
    ContractTemplateService,
    ConversionService,
    DataService,
    DepreciationService, // Added
    EmployeeService,
    FinanceService,
    FuelService,
    InventoryService,
    JournalService, // Added
    LifecycleService,
    LoanService,
    LocationService, // Added
    MaintenanceService,
    MaintenanceTemplateService,
    NotificationService,
    RbacService,
    RentalService,
    ReportService,
    SchedulerService,
    SensorService,
    SettingsService,
    TaxRenewalService,
    TimesheetService,
    UserService,
    WorkOrderService,
};
use crate::infrastructure::cache::{CacheOperations, RedisCache, RedisConfig};
use crate::infrastructure::repositories::{
    ApprovalRepository, AssetExpenseRepository, AssetRepository, AuditRepository,
    CategoryRepository, CategoryTemplateRepository, ClientRepository, ContractDocumentRepository,
    ConversionRepository, EmployeeRepository, FinanceRepository, FuelRepository,
    InventoryRepository, JournalRepository, LifecycleRepository, LoanRepository,
    MaintenanceRepository, MaintenanceTemplateRepository, NotificationRepository, RbacRepository,
    RentalRepository, SensorRepository, SettingsRepository, TaxRenewalRepository,
    TimesheetRepository, UserRepository, VendorRepository, WorkOrderRepository,
};
use crate::infrastructure::storage::FileStorage;
use crate::shared::utils::jwt::JwtConfig;
use std::sync::Arc;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub asset_service: AssetService,
    pub asset_expense_service: AssetExpenseService, // Added
    pub auth_service: AuthService,
    pub approval_service: ApprovalService,
    pub audit_service: AuditService,
    pub billing_service: BillingService,
    pub category_service: CategoryService,
    pub category_template_service: CategoryTemplateService,
    pub client_service: ClientService,
    pub contract_service: ContractService,
    pub contract_template_service: ContractTemplateService,
    pub conversion_service: ConversionService,
    pub lifecycle_service: LifecycleService,
    pub inventory_service: InventoryService,
    pub loan_service: LoanService,
    pub maintenance_service: MaintenanceService,
    pub maintenance_template_service: MaintenanceTemplateService,
    pub work_order_service: WorkOrderService,
    pub notification_service: NotificationService,
    pub rbac_service: RbacService,
    pub rental_service: RentalService,
    pub sensor_service: SensorService,
    pub timesheet_service: TimesheetService,
    pub data_service: DataService,
    pub scheduler_service: SchedulerService,
    pub user_service: UserService,
    pub report_service: ReportService,
    pub analytics_service: AnalyticsService,
    pub depreciation_service: DepreciationService, // Added
    pub employee_service: EmployeeService,
    pub location_service: LocationService, // Added
    pub leave_service: crate::application::services::LeaveService,
    pub finance_service: FinanceService,   // Added
    pub fuel_service: FuelService,         // Added
    pub journal_service: JournalService,   // Added
    pub settings_service: SettingsService, // Added
    pub rental_billing_service: crate::application::services::RentalBillingService, // Added
    pub pdf_service: crate::application::services::PDFService, // Added
    pub email_service: crate::application::services::EmailService, // Added
    pub tax_renewal_service: TaxRenewalService, // Added
    pub approval_workflow_service: crate::application::services::ApprovalWorkflowService,
    pub file_storage: Arc<FileStorage>,
    pub contract_document_repo: Arc<ContractDocumentRepository>,
    pub pool: PgPool,
    pub ws_manager: Arc<crate::api::handlers::notification_ws::WebSocketManager>,
    pub jwt_config: JwtConfig, // Added for middleware access
}

impl AppState {
    pub fn new(
        pool: PgPool,
        jwt_config: JwtConfig,
        config: &crate::shared::config::AppConfig,
    ) -> Self {
        // Create repositories
        let asset_repo = AssetRepository::new(pool.clone());
        let asset_expense_repo = AssetExpenseRepository::new(pool.clone()); // Added
        let user_repo = UserRepository::new(pool.clone());
        let category_repo = CategoryRepository::new(pool.clone());
        let category_template_repo = Arc::new(CategoryTemplateRepository::new(pool.clone()));
        let loan_repo = LoanRepository::new(pool.clone());
        let maintenance_repo = MaintenanceRepository::new(pool.clone());
        let maintenance_template_repo = MaintenanceTemplateRepository::new(pool.clone());
        let work_order_repo = WorkOrderRepository::new(pool.clone());
        let employee_repo = EmployeeRepository::new(pool.clone());
        let notification_repo = NotificationRepository::new(pool.clone());
        let rbac_repo = RbacRepository::new(pool.clone());
        let approval_repo = ApprovalRepository::new(pool.clone());
        let audit_repo = AuditRepository::new(pool.clone());
        let lifecycle_repo = LifecycleRepository::new(pool.clone());
        let conversion_repo = ConversionRepository::new(pool.clone());
        let sensor_repo = SensorRepository::new(pool.clone());
        let client_repo = ClientRepository::new(pool.clone());
        let rental_repo = RentalRepository::new(pool.clone());
        let timesheet_repo = TimesheetRepository::new(pool.clone());
        let rental_billing_repo =
            crate::infrastructure::repositories::RentalBillingRepository::new(pool.clone());
        let settings_repo = Arc::new(SettingsRepository::new(pool.clone()));
        let contract_template_repo = Arc::new(
            crate::infrastructure::repositories::ContractTemplateRepository::new(pool.clone()),
        );
        let approval_workflow_repo = Arc::new(
            crate::infrastructure::repositories::ApprovalWorkflowRepository::new(pool.clone()),
        );
        let finance_repo = FinanceRepository::new(pool.clone());
        let journal_repo = JournalRepository::new(pool.clone());
        let inventory_repo = Arc::new(InventoryRepository::new(pool.clone()));
        let tax_renewal_repo = TaxRenewalRepository::new(pool.clone());
        let vendor_repo = VendorRepository::new(pool.clone());

        // Create cache
        let redis_config = RedisConfig::from_env();
        let redis_cache = RedisCache::new(&redis_config);
        let cache: Arc<dyn CacheOperations> = Arc::new(redis_cache);

        // WebSocket & Notification Service first
        let ws_manager = Arc::new(crate::api::handlers::notification_ws::WebSocketManager::new());
        let notification_service = NotificationService::new(notification_repo, ws_manager.clone());

        // Create services
        let approval_service = ApprovalService::new(approval_repo);
        let asset_service = AssetService::new(
            asset_repo.clone(),
            journal_repo.clone(),
            cache.clone(),
            approval_service.clone(),
            notification_service.clone(),
        );
        let asset_expense_service = AssetExpenseService::new(
            asset_expense_repo,
            asset_repo.clone(),
            approval_service.clone(),
        ); // Added
        let audit_service = AuditService::new(audit_repo);
        let auth_service = AuthService::new(
            user_repo.clone(),
            rbac_repo.clone(),
            employee_repo.clone(),
            jwt_config.clone(),
        );
        let category_service = CategoryService::new(category_repo.clone());
        let category_template_service = CategoryTemplateService::new(category_template_repo);

        let email_service = crate::application::services::EmailService::new(config);
        let approval_workflow_service = crate::application::services::ApprovalWorkflowService::new(
            approval_workflow_repo.clone(),
        );
        let contract_service = ContractService::new(
            pool.clone(),
            notification_service.clone(),
            email_service.clone(),
            approval_workflow_service.clone(),
        );
        let contract_template_service =
            ContractTemplateService::new(contract_template_repo.clone());
        let loan_service =
            LoanService::new(loan_repo, asset_repo.clone(), notification_service.clone());
        let maintenance_service = MaintenanceService::new(
            maintenance_repo.clone(),
            asset_repo.clone(),
            approval_service.clone(),
            notification_service.clone(),
        );
        let maintenance_template_service =
            MaintenanceTemplateService::new(maintenance_template_repo.clone());
        let journal_service = JournalService::new(journal_repo.clone(), finance_repo.clone());
        let finance_service = FinanceService::new(finance_repo.clone(), journal_service.clone());
        let depreciation_service = DepreciationService::new(
            asset_repo.clone(),
            category_repo.clone(),
            journal_service.clone(),
        );

        let inventory_service = InventoryService::new(
            inventory_repo,
            journal_service.clone(),
            notification_service.clone(),
        );

        let work_order_service = WorkOrderService::new(
            work_order_repo,
            lifecycle_repo.clone(),
            asset_repo.clone(),
            cache.clone(),
            notification_service.clone(),
            asset_expense_service.clone(),
            maintenance_template_repo.clone(),
            inventory_service.clone(),
            journal_service.clone(),
        );
        let rbac_service = RbacService::new(rbac_repo.clone());
        let sensor_service = SensorService::new(
            sensor_repo,
            asset_repo.clone(),
            notification_service.clone(),
        );
        let conversion_service =
            ConversionService::new(conversion_repo.clone(), asset_repo.clone());
        let rental_service = RentalService::new(
            rental_repo.clone(),
            client_repo.clone(),
            asset_repo.clone(),
            employee_repo.clone(),
        );
        let rental_billing_service = crate::application::services::RentalBillingService::new(
            rental_billing_repo.clone(),
            rental_repo.clone(),
        );
        let pdf_service = crate::application::services::PDFService::new(
            rental_billing_repo.clone(),
            rental_repo.clone(),
            client_repo.clone(),
        );
        let email_service = crate::application::services::EmailService::new(config);
        let data_service = DataService::new(asset_repo.clone());
        let tax_renewal_service = TaxRenewalService::new(
            tax_renewal_repo,
            asset_repo.clone(),
            finance_service.clone(),
            vendor_repo.clone(),
        ); // Instantiate with finance and vendor repo
        let scheduler_service = SchedulerService::new(
            loan_service.clone(),
            maintenance_service.clone(),
            work_order_service.clone(),
            notification_service.clone(),
            asset_service.clone(),
            tax_renewal_service.clone(),
            depreciation_service.clone(),
        );
        let user_service = UserService::new(user_repo, rbac_repo);
        let report_service = ReportService::new(
            asset_repo.clone(),
            maintenance_repo.clone(),
            finance_repo.clone(),
        );
        let lifecycle_service = LifecycleService::new(lifecycle_repo.clone());
        let timesheet_service = TimesheetService::new(
            timesheet_repo.clone(),
            rental_repo.clone(),
            work_order_service.clone(),
        );
        let billing_service = BillingService::new(timesheet_repo.clone(), rental_repo.clone());
        let client_service = ClientService::new(client_repo.clone());
        let analytics_service = AnalyticsService::new(pool.clone());
        let employee_service = EmployeeService::new(employee_repo.clone(), user_service.clone());
        let location_repo =
            crate::infrastructure::repositories::LocationRepository::new(pool.clone());
        let location_service = LocationService::new(location_repo);

        let leave_repo = crate::infrastructure::repositories::LeaveRepository::new(pool.clone());
        let leave_service =
            crate::application::services::LeaveService::new(leave_repo, employee_repo);

        let fuel_repo = FuelRepository::new(pool.clone());
        let fuel_service = FuelService::new(fuel_repo, journal_service.clone());

        let settings_service = SettingsService::new(settings_repo);

        // File storage and contract document repository
        let file_storage = Arc::new(FileStorage::new("uploads/contracts"));
        let contract_document_repo = Arc::new(ContractDocumentRepository::new(pool.clone()));

        Self {
            asset_service,
            asset_expense_service, // Added
            audit_service,
            auth_service,
            category_service,
            category_template_service,
            client_service,
            contract_service,
            contract_template_service,
            conversion_service,
            lifecycle_service,
            inventory_service,
            loan_service,
            maintenance_service,
            maintenance_template_service,
            work_order_service,
            notification_service,
            rbac_service,
            rental_service,
            rental_billing_service,
            pdf_service,
            email_service,
            approval_workflow_service,
            approval_service,
            sensor_service,
            timesheet_service,
            billing_service,
            data_service,
            scheduler_service,
            user_service,
            report_service,
            analytics_service,
            employee_service,
            location_service,
            file_storage,
            contract_document_repo,
            pool,
            ws_manager,
            leave_service,
            finance_service,
            fuel_service,
            journal_service,
            settings_service,
            tax_renewal_service,
            depreciation_service, // Added & Moved to end
            jwt_config: jwt_config.clone(),
        }
    }
}

/// Create the application router
pub fn create_app(state: AppState) -> axum::Router {
    create_router(state)
        .merge(utoipa_swagger_ui::SwaggerUi::new("/swagger-ui").url(
            "/api-docs/openapi.json",
            crate::api::docs::ApiDoc::openapi(),
        ))
        .nest_service("/api/uploads", ServeDir::new("uploads"))
        .layer(axum::middleware::from_fn(
            crate::api::middleware::rate_limit::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn(
            crate::api::middleware::security_headers::security_headers_middleware,
        ))
        .layer(
            CorsLayer::new()
                .allow_origin([
                    "http://localhost:3000"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(),
                    "http://localhost:5173"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(),
                    "http://localhost:5174"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(),
                    "http://localhost:5175"
                        .parse::<axum::http::HeaderValue>()
                        .unwrap(),
                ])
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PUT,
                    axum::http::Method::DELETE,
                    axum::http::Method::PATCH,
                    axum::http::Method::OPTIONS,
                ])
                .allow_headers([
                    axum::http::header::AUTHORIZATION,
                    axum::http::header::CONTENT_TYPE,
                    axum::http::header::ACCEPT,
                ])
                .allow_credentials(true),
        )
}
