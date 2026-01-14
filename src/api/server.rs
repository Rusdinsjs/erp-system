//! Server Configuration

use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::api::routes::create_router;
use crate::application::services::{
    AnalyticsService,
    ApprovalService,
    AssetService,
    AuditService,
    AuthService,
    BillingService,
    CategoryService,
    ClientService,
    ConversionService,
    DataService,
    EmployeeService,
    LifecycleService,
    LoanService,
    LocationService, // Added
    MaintenanceService,
    NotificationService,
    RbacService,
    RentalService,
    ReportService,
    SchedulerService,
    SensorService,
    TimesheetService,
    UserService,
    WorkOrderService,
};
use crate::infrastructure::cache::{CacheOperations, RedisCache, RedisConfig};
use crate::infrastructure::repositories::{
    ApprovalRepository, AssetRepository, AuditRepository, CategoryRepository, ClientRepository,
    ConversionRepository, EmployeeRepository, LifecycleRepository, LoanRepository,
    MaintenanceRepository, NotificationRepository, RbacRepository, RentalRepository,
    SensorRepository, TimesheetRepository, UserRepository, WorkOrderRepository,
};
use crate::shared::utils::jwt::JwtConfig;
use std::sync::Arc;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub asset_service: AssetService,
    pub auth_service: AuthService,
    pub approval_service: ApprovalService,
    pub audit_service: AuditService,
    pub billing_service: BillingService,
    pub category_service: CategoryService,
    pub client_service: ClientService,
    pub conversion_service: ConversionService,
    pub lifecycle_service: LifecycleService,
    pub loan_service: LoanService,
    pub maintenance_service: MaintenanceService,
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
    pub employee_service: EmployeeService,
    pub location_service: LocationService, // Added
    pub pool: PgPool,
    pub ws_manager: Arc<crate::api::handlers::notification_ws::WebSocketManager>,
}

impl AppState {
    pub fn new(pool: PgPool, jwt_config: JwtConfig) -> Self {
        // Create repositories
        let asset_repo = AssetRepository::new(pool.clone());
        let user_repo = UserRepository::new(pool.clone());
        let category_repo = CategoryRepository::new(pool.clone());
        let loan_repo = LoanRepository::new(pool.clone());
        let maintenance_repo = MaintenanceRepository::new(pool.clone());
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

        // Create cache
        let redis_config = RedisConfig::from_env();
        let redis_cache = RedisCache::new(&redis_config);
        let cache: Arc<dyn CacheOperations> = Arc::new(redis_cache);

        // Create services
        let approval_service = ApprovalService::new(approval_repo);
        let asset_service =
            AssetService::new(asset_repo.clone(), cache.clone(), approval_service.clone());
        let audit_service = AuditService::new(audit_repo); // Added
        let auth_service = AuthService::new(
            user_repo.clone(),
            rbac_repo.clone(),
            employee_repo.clone(),
            jwt_config,
        );
        let category_service = CategoryService::new(category_repo);
        let notification_service = NotificationService::new(notification_repo);
        let loan_service =
            LoanService::new(loan_repo, asset_repo.clone(), notification_service.clone());
        let maintenance_service = MaintenanceService::new(
            maintenance_repo.clone(),
            asset_repo.clone(),
            approval_service.clone(),
        );
        let work_order_service = WorkOrderService::new(
            work_order_repo,
            lifecycle_repo.clone(),
            asset_repo.clone(),
            cache.clone(),
        );
        let rbac_service = RbacService::new(rbac_repo.clone());
        // Approval service moved up
        let sensor_service = SensorService::new(sensor_repo);
        let conversion_service =
            ConversionService::new(conversion_repo.clone(), asset_repo.clone());
        let rental_service =
            RentalService::new(rental_repo.clone(), client_repo.clone(), asset_repo.clone());
        let data_service = DataService::new(asset_repo.clone());
        let scheduler_service =
            SchedulerService::new(loan_service.clone(), maintenance_service.clone());
        let user_service = UserService::new(user_repo, rbac_repo);
        let report_service = ReportService::new(asset_repo.clone(), maintenance_repo.clone());
        let lifecycle_service = LifecycleService::new(lifecycle_repo.clone());
        let timesheet_service = TimesheetService::new(timesheet_repo.clone(), rental_repo.clone());
        let billing_service = BillingService::new(timesheet_repo.clone(), rental_repo.clone());
        let client_service = ClientService::new(client_repo.clone());
        let analytics_service = AnalyticsService::new(pool.clone());
        let employee_service = EmployeeService::new(employee_repo, user_service.clone());
        let location_repo =
            crate::infrastructure::repositories::LocationRepository::new(pool.clone());
        let location_service = LocationService::new(location_repo);

        Self {
            asset_service,
            audit_service,
            auth_service,
            category_service,
            client_service,
            conversion_service,
            lifecycle_service,
            loan_service,
            maintenance_service,
            work_order_service,
            notification_service,
            rbac_service,
            rental_service,
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
            pool,
            ws_manager: Arc::new(crate::api::handlers::notification_ws::WebSocketManager::new()),
        }
    }
}

/// Create the application router
pub fn create_app(state: AppState) -> axum::Router {
    create_router(state)
        .nest_service("/api/uploads", ServeDir::new("uploads"))
        .layer(CorsLayer::permissive())
}
