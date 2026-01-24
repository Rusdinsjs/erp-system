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
    ),
    components(
        schemas(
            crate::api::handlers::auth_handler::LoginRequest,
            crate::api::handlers::auth_handler::LoginResponse,
            crate::api::handlers::auth_handler::UserInfo,
            crate::application::dto::user_dto::CreateUserRequest,
            crate::domain::entities::User,
            
            // Asset & Common
            crate::domain::entities::asset::Asset,
            crate::domain::entities::asset::AssetSummary,
            crate::domain::entities::asset::AssetDetail,
            crate::application::dto::asset_dto::CreateAssetRequest,
            crate::application::dto::asset_dto::UpdateAssetRequest,
            crate::application::dto::asset_dto::VehicleDetailsDto,
            crate::application::dto::asset_dto::AssetSearchParams,
            crate::infrastructure::repositories::approval_repository::ApprovalRequest,
            
            // Generic Aliases (must match #[aliases(...)] in structs)
            crate::application::dto::common::PaginatedResponseAssetSummary,
            crate::application::dto::common::ApiResponseAsset,
            // crate::application::dto::common::ApiResponseApprovalRequest, // Need to annotate ApprovalRequest first if we use it
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
