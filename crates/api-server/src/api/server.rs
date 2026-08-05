//! Server Configuration

use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use utoipa::OpenApi;

// use crate::api::middleware::security_headers::security_headers_middleware;
use crate::api::routes::create_router;
use crate::application::services::scheduler_service::SchedulerService;
use management_system_assets::{CategoryService, CategoryTemplateService};
use management_system_core::application::services::{
    AnalyticsService, ApprovalService, AuditService, AuthService, BillingService, ClientService,
    ContractService, ContractTemplateService, ConversionService, EmployeeService, LifecycleService,
    LoanService, LocationService, MaintenanceService, MaintenanceTemplateService,
    NotificationService, RbacService, ReportService, SensorService, SettingsService, UserService,
};
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::cache::{CacheOperations, RedisCache, RedisConfig};
use management_system_core::infrastructure::repositories::LeaveRepository;
use management_system_core::infrastructure::repositories::{
    ApprovalRepository, AssetExpenseRepository, AssetRepository, AuditRepository,
    CategoryRepository, CategoryTemplateRepository, ClientRepository, ContractDocumentRepository,
    ConversionRepository, EmployeeRepository, FinanceRepository, FuelRepository,
    InventoryRepository, JournalRepository, LifecycleRepository, LoanRepository,
    MaintenanceRepository, MaintenanceTemplateRepository, NotificationRepository, RbacRepository,
    RentalRepository, SensorRepository, SettingsRepository, TaxRenewalRepository,
    TimesheetRepository, UserRepository, VendorRepository, WorkOrderRepository,
};
use management_system_core::infrastructure::storage::FileStorage;
use management_system_core::shared::utils::jwt::JwtConfig;
use management_system_finance::{AssetExpenseService, DepreciationService, JournalService};
use management_system_ops::{FuelService, RentalService, TaxRenewalService, TimesheetService};
use std::sync::Arc;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub asset_service: management_system_assets::AssetService,
    pub asset_expense_service: management_system_finance::AssetExpenseService,
    pub auth_service: AuthService,
    pub approval_service: ApprovalService,
    pub audit_service: AuditService,
    pub billing_service: BillingService,
    pub category_service: management_system_assets::CategoryService,
    pub category_template_service: management_system_assets::CategoryTemplateService,
    pub client_service: ClientService,
    pub contract_service: ContractService,
    pub contract_template_service: ContractTemplateService,
    pub conversion_service: ConversionService,
    pub lifecycle_service: LifecycleService,
    pub inventory_service: management_system_ops::InventoryService,
    pub loan_service: LoanService,
    pub maintenance_service: MaintenanceService,
    pub maintenance_template_service: MaintenanceTemplateService,
    pub work_order_service: management_system_ops::WorkOrderService,
    pub notification_service: NotificationService,
    pub rbac_service: RbacService,
    pub rental_service: management_system_ops::RentalService,
    pub sensor_service: SensorService,
    pub timesheet_service: management_system_ops::TimesheetService,
    pub scheduler_service: SchedulerService,
    pub user_service: UserService,
    pub report_service: ReportService,
    pub analytics_service: AnalyticsService,
    pub employee_service: EmployeeService,
    pub location_service: LocationService,
    pub leave_service: management_system_ops::LeaveService,
    pub finance_service: management_system_finance::FinanceService,
    pub fuel_service: management_system_ops::FuelService,
    pub journal_service: management_system_finance::JournalService,
    pub settings_service: SettingsService,
    pub rental_billing_service: management_system_ops::RentalBillingService,
    pub pdf_service: management_system_core::application::services::PDFService,
    pub email_service: management_system_core::application::services::EmailService,
    pub tax_renewal_service: management_system_ops::TaxRenewalService,
    pub approval_workflow_service:
        management_system_core::application::services::ApprovalWorkflowService,
    pub approval_entity_type_service:
        management_system_core::application::services::ApprovalEntityTypeService,
    pub file_storage: Arc<FileStorage>,
    pub contract_document_repo: Arc<ContractDocumentRepository>,
    pub pool: PgPool,
    pub ws_manager: Arc<management_system_core::infrastructure::notifications::WebSocketManager>,
    pub jwt_config: JwtConfig, // Added for middleware access
}

impl AppState {
    pub fn new(
        pool: PgPool,
        jwt_config: JwtConfig,
        config: &management_system_core::shared::config::AppConfig,
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
            management_system_core::infrastructure::repositories::RentalBillingRepository::new(
                pool.clone(),
            );
        let settings_repo = Arc::new(SettingsRepository::new(pool.clone()));
        let contract_template_repo = Arc::new(
            management_system_core::infrastructure::repositories::ContractTemplateRepository::new(
                pool.clone(),
            ),
        );
        let approval_workflow_repo = Arc::new(
            management_system_core::infrastructure::repositories::ApprovalWorkflowRepository::new(
                pool.clone(),
            ),
        );
        let approval_entity_type_repo = Arc::new(
            management_system_core::infrastructure::repositories::ApprovalEntityTypeRepository::new(
                pool.clone(),
            ),
        );
        let finance_repo = FinanceRepository::new(pool.clone());
        let journal_repo = JournalRepository::new(pool.clone());
        let inventory_repo = Arc::new(InventoryRepository::new(pool.clone()));
        let tax_renewal_repo = TaxRenewalRepository::new(pool.clone());
        let leave_repo = LeaveRepository::new(pool.clone());
        let vendor_repo = VendorRepository::new(pool.clone());

        // Create Internal Event Bus
        let event_bus = EventBus::new(1024);

        // Create cache
        let redis_config = RedisConfig::from_env();
        let redis_cache = RedisCache::new(&redis_config);
        let cache: Arc<dyn CacheOperations> = Arc::new(redis_cache);

        // WebSocket & Notification Service first
        let ws_manager = Arc::new(
            management_system_core::infrastructure::notifications::WebSocketManager::new(),
        );
        let notification_service = NotificationService::new(notification_repo, ws_manager.clone());

        let audit_service = AuditService::new(audit_repo.clone());

        // Start Internal Event Listeners
        notification_service.start_event_listener(event_bus.subscribe());
        audit_service.start_event_listener(event_bus.subscribe());

        // Create services
        let approval_repo_arc = std::sync::Arc::new(approval_repo);
        let mut approval_service = ApprovalService::new(approval_repo_arc.clone());
        
        // We need to register callbacks after creating all services
        // So we'll do it after all services are created
        let asset_service = management_system_assets::AssetService::new(
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
        let auth_service = AuthService::new(
            user_repo.clone(),
            rbac_repo.clone(),
            employee_repo.clone(),
            jwt_config.clone(),
        );
        let category_service = CategoryService::new(category_repo.clone());
        let category_template_service = CategoryTemplateService::new(category_template_repo);

        let email_service =
            management_system_core::application::services::EmailService::new(config);
        let approval_entity_type_service =
            management_system_core::application::services::ApprovalEntityTypeService::new(
                approval_entity_type_repo.clone(),
            );
        let approval_workflow_service =
            management_system_core::application::services::ApprovalWorkflowService::new(
                approval_workflow_repo.clone(),
                approval_entity_type_repo.clone(),
            );
        let contract_service = ContractService::new(
            pool.clone(),
            notification_service.clone(),
            email_service.clone(),
            approval_workflow_service.clone(),
        );
        let contract_template_service =
            ContractTemplateService::new(contract_template_repo.clone());
        let loan_service = LoanService::new(loan_repo.clone(), asset_repo.clone(), event_bus.clone());
        let maintenance_service = MaintenanceService::new(
            maintenance_repo.clone(),
            asset_repo.clone(),
            approval_service.clone(),
            notification_service.clone(),
        );
        let maintenance_template_service =
            MaintenanceTemplateService::new(maintenance_template_repo.clone());
        let journal_service = JournalService::new(journal_repo.clone(), finance_repo.clone());
        let finance_service = management_system_finance::FinanceService::new(
            finance_repo.clone(),
            journal_service.clone(),
            asset_expense_service.clone(),
            asset_repo.clone(),
            rental_repo.clone(),
            event_bus.clone(),
        );
        finance_service.start_event_listener(event_bus.subscribe());
        let depreciation_service = DepreciationService::new(
            asset_repo.clone(),
            category_repo.clone(),
            journal_service.clone(),
        );

        let inventory_service = management_system_ops::InventoryService::new(
            inventory_repo.clone(),
            journal_service.clone(),
            notification_service.clone(),
        );

        let work_order_service = management_system_ops::WorkOrderService::new(
            work_order_repo.clone(),
            lifecycle_repo.clone(),
            asset_repo.clone(),
            cache.clone(),
            notification_service.clone(),
            asset_expense_service.clone(),
            maintenance_template_repo.clone(),
            inventory_service.clone(),
            event_bus.clone(),
        );
        let rbac_service = RbacService::new(rbac_repo.clone());
        let sensor_service = SensorService::new(
            sensor_repo.clone(),
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
        let rental_billing_service = management_system_ops::RentalBillingService::new(
            rental_billing_repo.clone(),
            rental_repo.clone(),
            event_bus.clone(),
        );
        let pdf_service = management_system_core::application::services::PDFService::new(
            rental_billing_repo.clone(),
            rental_repo.clone(),
            client_repo.clone(),
        );
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
        let fuel_repo = FuelRepository::new(pool.clone());
        let fuel_service = FuelService::new(fuel_repo.clone(), event_bus.clone());

        let report_service = ReportService::new(
            asset_repo.clone(),
            maintenance_repo.clone(),
            finance_repo.clone(),
            (*settings_repo).clone(),
            fuel_repo.clone(),
            loan_repo.clone(),
            work_order_repo.clone(),
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
            management_system_core::infrastructure::repositories::LocationRepository::new(
                pool.clone(),
            );
        let location_service = LocationService::new(location_repo);

        let leave_service = management_system_ops::LeaveService::new(leave_repo, employee_repo);

        let settings_service = SettingsService::new(settings_repo);

        // File storage and contract document repository
        let file_storage = Arc::new(FileStorage::new("uploads/contracts"));
        let contract_document_repo = Arc::new(ContractDocumentRepository::new(pool.clone()));

        // Register module callbacks in approval service
        // Work Order
        approval_service.register_callback(Box::new(work_order_service.clone()));
        // Loan
        approval_service.register_callback(Box::new(loan_service.clone()));
        // Fuel
        approval_service.register_callback(Box::new(fuel_service.clone()));
        // Tax Renewal
        approval_service.register_callback(Box::new(tax_renewal_service.clone()));
        // Conversion
        approval_service.register_callback(Box::new(conversion_service.clone()));
        // Contract
        approval_service.register_callback(Box::new(contract_service.clone()));

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
            approval_entity_type_service,
            approval_service,
            sensor_service,
            timesheet_service,
            billing_service,
            scheduler_service,
            user_service,
            report_service,
            analytics_service,
            employee_service,
            location_service,
            leave_service,
            finance_service,
            fuel_service,
            journal_service,
            settings_service,
            file_storage,
            contract_document_repo,
            pool,
            ws_manager,
            tax_renewal_service,
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
                    axum::http::HeaderValue::from_static("http://localhost:3000"),
                    axum::http::HeaderValue::from_static("http://localhost:5173"),
                    axum::http::HeaderValue::from_static("http://localhost:5174"),
                    axum::http::HeaderValue::from_static("http://localhost:5175"),
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
