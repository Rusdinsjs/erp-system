use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// App Status Enum (QAPP-003)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppStatus {
    Installed,
    Enabled,
    Disabled,
}

impl AppStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AppStatus::Installed => "INSTALLED",
            AppStatus::Enabled => "ENABLED",
            AppStatus::Disabled => "DISABLED",
        }
    }
}

/// AppManifest Metadata Contract (QAPP-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppManifest {
    pub app_name: String,
    pub version: String,
    pub required_kernel_version: String,
    pub dependencies: Vec<String>,
    pub description: Option<String>,
}

impl AppManifest {
    /// Check if current kernel version satisfies the required kernel version spec (QAPP-002, QAPP-009)
    pub fn is_compatible_with_kernel(&self, current_kernel_version: &str) -> bool {
        if self.required_kernel_version == current_kernel_version {
            return true;
        }
        let req_parts: Vec<&str> = self.required_kernel_version.split('.').collect();
        let cur_parts: Vec<&str> = current_kernel_version.split('.').collect();

        if req_parts.len() >= 2 && cur_parts.len() >= 2 {
            return req_parts[0] == cur_parts[0] && cur_parts[1] >= req_parts[1];
        }
        false
    }
}

/// Installed App Entity (QAPP-001, QAPP-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub app_name: String,
    pub version: String,
    pub required_kernel_version: String,
    pub status: String,
    pub installed_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl InstalledApp {
    /// Transition app status safely (QAPP-003)
    pub fn set_status(&mut self, new_status: AppStatus) {
        self.status = new_status.as_str().to_string();
        self.updated_at = Utc::now();
    }
}

/// Namespaced App Migration History Entity (QAPP-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppMigrationEntry {
    pub id: Uuid,
    pub app_name: String,
    pub migration_name: String,
    pub executed_at: DateTime<Utc>,
}
