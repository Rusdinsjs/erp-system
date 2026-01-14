//! Asset Lifecycle State Machine
//!
//! Defines the possible states of an asset and valid transitions between states.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Asset lifecycle states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum AssetState {
    #[default]
    Planning,
    Procurement,
    Received,
    InInventory,
    Deployed,
    RentedOut,
    UnderMaintenance,
    UnderRepair,
    UnderConversion,
    Retired,
    Disposed,
    LostStolen,
    Archived,
}

impl AssetState {
    /// Get the string representation of the state
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planning => "planning",
            Self::Procurement => "procurement",
            Self::Received => "received",
            Self::InInventory => "in_inventory",
            Self::Deployed => "deployed",
            Self::RentedOut => "rented_out",
            Self::UnderMaintenance => "under_maintenance",
            Self::UnderRepair => "under_repair",
            Self::UnderConversion => "under_conversion",
            Self::Retired => "retired",
            Self::Disposed => "disposed",
            Self::LostStolen => "lost_stolen",
            Self::Archived => "archived",
        }
    }

    /// Parse state from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "planning" => Some(Self::Planning),
            "procurement" => Some(Self::Procurement),
            "received" => Some(Self::Received),
            "in_inventory" => Some(Self::InInventory),
            "deployed" => Some(Self::Deployed),
            "rented_out" => Some(Self::RentedOut),
            "under_maintenance" => Some(Self::UnderMaintenance),
            "under_repair" => Some(Self::UnderRepair),
            "under_conversion" => Some(Self::UnderConversion),
            "retired" => Some(Self::Retired),
            "disposed" => Some(Self::Disposed),
            "lost_stolen" => Some(Self::LostStolen),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    /// Check if a transition to the target state is valid
    pub fn can_transition_to(&self, target: &AssetState) -> bool {
        // Special case: Any state can transition to LostStolen
        if *target == Self::LostStolen {
            return true;
        }

        match self {
            Self::Planning => matches!(target, Self::Procurement),
            Self::Procurement => matches!(target, Self::Received),
            Self::Received => matches!(target, Self::InInventory),
            Self::InInventory => matches!(target, Self::Deployed | Self::RentedOut),
            Self::Deployed => matches!(
                target,
                Self::UnderMaintenance | Self::UnderRepair | Self::UnderConversion | Self::Retired
            ),
            Self::RentedOut => matches!(target, Self::InInventory),
            Self::UnderMaintenance => matches!(target, Self::Deployed),
            Self::UnderRepair => matches!(target, Self::Deployed),
            Self::UnderConversion => matches!(target, Self::Deployed),
            Self::Retired => matches!(target, Self::Disposed),
            Self::Disposed => false,
            Self::LostStolen => matches!(target, Self::Archived),
            Self::Archived => false,
        }
    }

    /// Get all valid transitions from this state
    pub fn valid_transitions(&self) -> Vec<AssetState> {
        let mut transitions = vec![Self::LostStolen]; // Always available

        match self {
            Self::Planning => transitions.push(Self::Procurement),
            Self::Procurement => transitions.push(Self::Received),
            Self::Received => transitions.push(Self::InInventory),
            Self::InInventory => transitions.extend([Self::Deployed, Self::RentedOut]),
            Self::Deployed => {
                transitions.extend([
                    Self::UnderMaintenance,
                    Self::UnderRepair,
                    Self::UnderConversion,
                    Self::Retired,
                ]);
            }
            Self::RentedOut => transitions.push(Self::InInventory),
            Self::UnderMaintenance => transitions.push(Self::Deployed),
            Self::UnderRepair => transitions.push(Self::Deployed),
            Self::UnderConversion => transitions.push(Self::Deployed),
            Self::Retired => transitions.push(Self::Disposed),
            Self::LostStolen => transitions.push(Self::Archived),
            Self::Disposed | Self::Archived => {
                transitions.clear(); // No transitions from terminal states
            }
        }

        transitions
    }

    /// Check if this is a terminal state (no further transitions possible)
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Disposed | Self::Archived)
    }

    /// Check if asset is actively in use
    pub fn is_active(&self) -> bool {
        matches!(
            self,
            Self::InInventory
                | Self::Deployed
                | Self::RentedOut
                | Self::UnderMaintenance
                | Self::UnderRepair
        )
    }

    /// Get display name for UI
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Planning => "Planning",
            Self::Procurement => "Procurement",
            Self::Received => "Received",
            Self::InInventory => "In Inventory",
            Self::Deployed => "Deployed",
            Self::RentedOut => "Rented Out",
            Self::UnderMaintenance => "Under Maintenance",
            Self::UnderRepair => "Under Repair",
            Self::UnderConversion => "Under Conversion",
            Self::Retired => "Retired",
            Self::Disposed => "Disposed",
            Self::LostStolen => "Lost/Stolen",
            Self::Archived => "Archived",
        }
    }

    /// Get color for UI display
    pub fn color(&self) -> &'static str {
        match self {
            Self::Planning => "gray",
            Self::Procurement => "blue",
            Self::Received => "cyan",
            Self::InInventory => "green",
            Self::Deployed => "emerald",
            Self::RentedOut => "orange",
            Self::UnderMaintenance => "yellow",
            Self::UnderRepair => "amber",
            Self::UnderConversion => "violet",
            Self::Retired => "slate",
            Self::Disposed => "neutral",
            Self::LostStolen => "red",
            Self::Archived => "zinc",
        }
    }
}

impl fmt::Display for AssetState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// State transition event for audit logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    pub from_state: AssetState,
    pub to_state: AssetState,
    pub reason: Option<String>,
    pub performed_by: Option<uuid::Uuid>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl StateTransition {
    pub fn new(
        from_state: AssetState,
        to_state: AssetState,
        reason: Option<String>,
        performed_by: Option<uuid::Uuid>,
    ) -> Self {
        Self {
            from_state,
            to_state,
            reason,
            performed_by,
            timestamp: chrono::Utc::now(),
        }
    }
}

/// Lifecycle history record (database entity)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LifecycleHistory {
    pub id: uuid::Uuid,
    pub asset_id: uuid::Uuid,
    pub from_state: String,
    pub to_state: String,
    pub reason: Option<String>,
    pub performed_by: Option<uuid::Uuid>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl LifecycleHistory {
    pub fn new(
        asset_id: uuid::Uuid,
        from_state: &AssetState,
        to_state: &AssetState,
        reason: Option<String>,
        performed_by: Option<uuid::Uuid>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            asset_id,
            from_state: from_state.as_str().to_string(),
            to_state: to_state.as_str().to_string(),
            reason,
            performed_by,
            metadata: None,
            created_at: chrono::Utc::now(),
        }
    }
}

/// Conversion type enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversionType {
    FunctionChange,
    Upgrade,
    Downgrade,
    Customization,
    Repurposing,
}

impl ConversionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FunctionChange => "function_change",
            Self::Upgrade => "upgrade",
            Self::Downgrade => "downgrade",
            Self::Customization => "customization",
            Self::Repurposing => "repurposing",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "function_change" => Some(Self::FunctionChange),
            "upgrade" => Some(Self::Upgrade),
            "downgrade" => Some(Self::Downgrade),
            "customization" => Some(Self::Customization),
            "repurposing" => Some(Self::Repurposing),
            _ => None,
        }
    }
}

/// Conversion status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversionStatus {
    Pending,
    Approved,
    Rejected,
    InProgress,
    Completed,
    Cancelled,
}

impl ConversionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

/// Asset conversion request (database entity)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AssetConversion {
    pub id: uuid::Uuid,
    pub asset_id: uuid::Uuid,
    pub from_category_id: Option<uuid::Uuid>,
    pub to_category_id: Option<uuid::Uuid>,
    pub from_subtype: Option<String>,
    pub to_subtype: Option<String>,
    pub conversion_type: String,
    pub conversion_cost: Option<rust_decimal::Decimal>,
    pub old_specifications: Option<serde_json::Value>,
    pub new_specifications: Option<serde_json::Value>,
    pub justification: String,
    pub status: String,
    pub requested_by: uuid::Uuid,
    pub approved_by: Option<uuid::Uuid>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub executed_by: Option<uuid::Uuid>,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        assert!(AssetState::Planning.can_transition_to(&AssetState::Procurement));
        assert!(AssetState::Deployed.can_transition_to(&AssetState::UnderMaintenance));
        assert!(AssetState::UnderMaintenance.can_transition_to(&AssetState::Deployed));
    }

    #[test]
    fn test_invalid_transitions() {
        assert!(!AssetState::Planning.can_transition_to(&AssetState::Deployed));
        assert!(!AssetState::Disposed.can_transition_to(&AssetState::Deployed));
    }

    #[test]
    fn test_lost_stolen_from_any_state() {
        assert!(AssetState::Planning.can_transition_to(&AssetState::LostStolen));
        assert!(AssetState::Deployed.can_transition_to(&AssetState::LostStolen));
        assert!(AssetState::Retired.can_transition_to(&AssetState::LostStolen));
    }

    #[test]
    fn test_terminal_states() {
        assert!(AssetState::Disposed.is_terminal());
        assert!(AssetState::Archived.is_terminal());
        assert!(!AssetState::Deployed.is_terminal());
    }
}
