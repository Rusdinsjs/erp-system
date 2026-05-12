use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::handlers::auth_handler::login,
        crate::api::handlers::auth_handler::register,
        crate::api::handlers::asset_handler::list_assets,
        crate::api::handlers::asset_handler::search_assets,
        crate::api::handlers::asset_handler::get_asset,
        crate::api::handlers::asset_handler::create_asset,
        crate::api::handlers::asset_handler::update_asset,
        crate::api::handlers::asset_handler::delete_asset,
        crate::api::handlers::dashboard_handler::get_dashboard_stats,
        crate::api::handlers::dashboard_handler::get_recent_activities,
        crate::api::handlers::dashboard_handler::get_depreciation_summary,
    ),
    components(
        schemas(
            crate::api::handlers::auth_handler::LoginRequest,
            crate::api::handlers::auth_handler::LoginResponse,
            crate::api::handlers::auth_handler::UserInfo,
            management_system_core::application::dto::user_dto::CreateUserRequest,
            management_system_core::domain::entities::User,
            
            // Asset & Common
            management_system_core::domain::entities::asset::Asset,
            management_system_core::domain::entities::asset::AssetSummary,
            management_system_core::domain::entities::asset::AssetDetail,
            management_system_core::application::dto::asset_dto::CreateAssetRequest,
            management_system_core::application::dto::asset_dto::UpdateAssetRequest,
            management_system_core::application::dto::asset_dto::VehicleDetailsDto,
            management_system_core::application::dto::asset_dto::AssetSearchParams,
            management_system_core::infrastructure::repositories::approval_repository::ApprovalRequest,
            
            // Generic Aliases (must match #[aliases(...)] in structs)
            management_system_core::application::dto::common::PaginatedResponseAssetSummary,
            management_system_core::application::dto::common::ApiResponseAsset,
            // management_system_core::application::dto::common::ApiResponseApprovalRequest, // Need to annotate ApprovalRequest first if we use it
            
            // Dashboard Schemas
            management_system_core::application::dto::dashboard_dto::DashboardStats,
            management_system_core::application::dto::dashboard_dto::AssetStats,
            management_system_core::application::dto::dashboard_dto::MaintenanceStats,
            management_system_core::application::dto::dashboard_dto::LoanStats,
            management_system_core::application::dto::dashboard_dto::AlertStats,
            management_system_core::application::dto::dashboard_dto::CategoryDistribution,
            management_system_core::application::dto::dashboard_dto::StatusCount,
            crate::api::handlers::dashboard_handler::RecentActivity,
            crate::api::handlers::dashboard_handler::DepreciationSummary,
        )
    ),
    tags(
        (name = "auth", description = "Authentication endpoints"),
        (name = "assets", description = "Asset Management endpoints")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

pub struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "token",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::HttpBuilder::new()
                        .scheme(utoipa::openapi::security::HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            );
        }
    }
}
