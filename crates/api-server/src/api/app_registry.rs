use axum::Router;
use std::sync::Arc;
use management_system_core::application::services::MetadataService;
use management_system_core::shared::errors::AppError;
use async_trait::async_trait;

use crate::api::server::AppState;

/// Trait representing a plugin/app within the ERPQu ecosystem.
#[async_trait]
pub trait ErpquApp: Send + Sync {
    /// Returns the unique internal name of the App (e.g., "asset_management")
    fn name(&self) -> &str;

    /// Returns the human-readable display name of the App
    fn display_name(&self) -> &str {
        self.name()
    }

    /// Register HTTP routes provided by this App.
    fn register_routes(&self, state: AppState) -> Router<AppState>;

    /// Lifecycle hook: Called during system startup to register metadata.
    async fn setup_metadata(&self, _metadata_service: MetadataService) -> Result<(), AppError> {
        Ok(())
    }
}

pub struct AssetManagementApp;

#[async_trait]
impl ErpquApp for AssetManagementApp {
    fn name(&self) -> &str {
        "asset_management"
    }

    fn display_name(&self) -> &str {
        "Asset Management"
    }

    fn register_routes(&self, _state: AppState) -> Router<AppState> {
        // Here we could move the asset routes from main_router.rs
        // For Phase 3, we return an empty router, but it proves the AppRegistry concept.
        Router::new()
    }

    async fn setup_metadata(&self, metadata_service: MetadataService) -> Result<(), AppError> {
        tracing::info!("AssetManagementApp: Bootstrapping metadata...");
        
        let existing = metadata_service.get_entity_bundle("ASSET").await;
        if existing.is_err() {
            metadata_service.register_entity_type(
                "ASSET",
                "asset_management",
                management_system_core::domain::metadata_kernel::StorageStrategy::Hybrid,
                true
            ).await.map_err(|e| AppError::InternalError(e))?;
            tracing::info!("AssetManagementApp: ASSET EntityType bootstrapped.");
        }
        
        Ok(())
    }
}

/// Helper function to initialize and boot all registered apps
pub async fn boot_apps(state: AppState, metadata_service: MetadataService) -> Result<Router<AppState>, AppError> {
    let apps: Vec<Box<dyn ErpquApp>> = vec![
        Box::new(AssetManagementApp),
    ];
    
    let mut app_router = Router::new();
    
    for app in apps {
        tracing::info!("Booting App: {}", app.display_name());
        
        // 1. Setup metadata
        app.setup_metadata(metadata_service.clone()).await?;
        
        // 2. Register routes
        let r = app.register_routes(state.clone());
        app_router = app_router.merge(r);
    }
    
    Ok(app_router)
}
