use crate::domain::entities::setting::Setting;
use crate::infrastructure::repositories::settings_repository::SettingsRepository;
use crate::shared::errors::AppError;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct SettingsService {
    repository: Arc<SettingsRepository>,
}

impl SettingsService {
    pub fn new(repository: Arc<SettingsRepository>) -> Self {
        Self { repository }
    }

    pub async fn get_setting(&self, key: &str) -> Result<Setting, AppError> {
        self.repository
            .get(key)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Setting {} not found", key)))
    }

    pub async fn update_setting(
        &self,
        key: &str,
        value: serde_json::Value,
        description: Option<String>,
        user_id: Uuid,
    ) -> Result<Setting, AppError> {
        self.repository
            .set(key, value, description, Some(user_id))
            .await
    }

    pub async fn list_settings(&self) -> Result<Vec<Setting>, AppError> {
        self.repository.list().await
    }

    pub async fn get_public_settings(&self) -> Result<serde_json::Value, AppError> {
        // Fetch only specific keys safe for public consumption
        let mut public_config = serde_json::Map::new();

        let keys = vec!["app_name", "company_logo"];

        for key in keys {
            if let Ok(Some(setting)) = self.repository.get(key).await {
                public_config.insert(key.to_string(), setting.value);
            }
        }

        // Add defaults if missing
        if !public_config.contains_key("app_name") {
            public_config.insert("app_name".to_string(), json!("Asset Management System"));
        }

        Ok(serde_json::Value::Object(public_config))
    }
}
