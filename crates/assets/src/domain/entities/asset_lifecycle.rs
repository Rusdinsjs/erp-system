//! Asset Lifecycle State Machine
//!
//! Defines the possible states of an asset and valid transitions between states.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

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
    Sold,
    LostStolen,
    Archived,
}

impl std::str::FromStr for AssetState {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "planning" => Ok(Self::Planning),
            "procurement" => Ok(Self::Procurement),
            "received" => Ok(Self::Received),
            "in_inventory" | "available" | "in inventory" => Ok(Self::InInventory),
            "deployed" | "in_use" | "active" | "in use" => Ok(Self::Deployed),
            "rented_out" | "rented out" => Ok(Self::RentedOut),
            "under_maintenance" | "in_maintenance" | "maintenance" | "under maintenance" => {
                Ok(Self::UnderMaintenance)
            }
            "under_repair" | "in_repair" | "under repair" => Ok(Self::UnderRepair),
            "under_conversion" | "in_conversion" | "under conversion" => Ok(Self::UnderConversion),
            "retired" => Ok(Self::Retired),
            "disposed" => Ok(Self::Disposed),
            "sold" => Ok(Self::Sold),
            "lost_stolen" | "lost stolen" | "lost/stolen" => Ok(Self::LostStolen),
            "archived" => Ok(Self::Archived),
            _ => Err(()),
        }
    }
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
            Self::Sold => "sold",
            Self::LostStolen => "lost_stolen",
            Self::Archived => "archived",
        }
    }

    /// Parse state from string (Legacy support, use FromStr)
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }

    /// Check if a transition to the target state is valid
    pub fn can_transition_to(&self, target: &AssetState) -> bool {
        // Special case: Any non-terminal state can transition to LostStolen
        if *target == Self::LostStolen && !self.is_terminal() {
            return true;
        }

        match self {
            Self::Planning => matches!(target, Self::Procurement | Self::Archived),
            Self::Procurement => matches!(target, Self::Received | Self::Planning | Self::Archived),
            Self::Received => matches!(
                target,
                Self::InInventory | Self::Deployed | Self::UnderMaintenance | Self::UnderConversion
            ),
            Self::InInventory => matches!(
                target,
                Self::Deployed
                    | Self::RentedOut
                    | Self::UnderMaintenance
                    | Self::UnderRepair
                    | Self::UnderConversion
                    | Self::Retired
                    | Self::Sold
            ),
            Self::Deployed => matches!(
                target,
                Self::InInventory
                    | Self::RentedOut
                    | Self::UnderMaintenance
                    | Self::UnderRepair
                    | Self::UnderConversion
                    | Self::Retired
                    | Self::Sold
            ),
            Self::RentedOut => matches!(
                target,
                Self::InInventory
                    | Self::Deployed
                    | Self::UnderMaintenance
                    | Self::UnderRepair
                    | Self::UnderConversion
                    | Self::Sold
            ),
            Self::UnderMaintenance => matches!(
                target,
                Self::Deployed
                    | Self::InInventory
                    | Self::UnderRepair
                    | Self::UnderConversion
                    | Self::Retired
            ),
            Self::UnderRepair => matches!(
                target,
                Self::Deployed
                    | Self::InInventory
                    | Self::UnderMaintenance
                    | Self::UnderConversion
                    | Self::Retired
            ),
            Self::UnderConversion => matches!(
                target,
                Self::Deployed | Self::InInventory | Self::UnderMaintenance | Self::UnderRepair
            ),
            Self::Retired => matches!(
                target,
                Self::InInventory | Self::Disposed | Self::Sold | Self::Archived
            ),
            Self::Disposed | Self::Sold => matches!(target, Self::Archived),
            Self::LostStolen => {
                matches!(target, Self::InInventory | Self::Retired | Self::Archived)
            }
            Self::Archived => matches!(target, Self::InInventory),
        }
    }

    /// Get all valid transitions from this state
    pub fn valid_transitions(&self) -> Vec<AssetState> {
        let mut transitions = Vec::new();
        if !self.is_terminal() && *self != Self::LostStolen {
            transitions.push(Self::LostStolen); // Always available for active assets
        }

        match self {
            Self::Planning => transitions.extend([Self::Procurement, Self::Archived]),
            Self::Procurement => {
                transitions.extend([Self::Received, Self::Planning, Self::Archived])
            }
            Self::Received => transitions.extend([
                Self::InInventory,
                Self::Deployed,
                Self::UnderMaintenance,
                Self::UnderConversion,
            ]),
            Self::InInventory => transitions.extend([
                Self::Deployed,
                Self::RentedOut,
                Self::UnderMaintenance,
                Self::UnderRepair,
                Self::UnderConversion,
                Self::Retired,
                Self::Sold,
            ]),
            Self::Deployed => {
                transitions.extend([
                    Self::InInventory,
                    Self::RentedOut,
                    Self::UnderMaintenance,
                    Self::UnderRepair,
                    Self::UnderConversion,
                    Self::Retired,
                    Self::Sold,
                ]);
            }
            Self::RentedOut => transitions.extend([
                Self::InInventory,
                Self::Deployed,
                Self::UnderMaintenance,
                Self::UnderRepair,
                Self::UnderConversion,
                Self::Sold,
            ]),
            Self::UnderMaintenance => transitions.extend([
                Self::Deployed,
                Self::InInventory,
                Self::UnderRepair,
                Self::UnderConversion,
                Self::Retired,
            ]),
            Self::UnderRepair => transitions.extend([
                Self::Deployed,
                Self::InInventory,
                Self::UnderMaintenance,
                Self::UnderConversion,
                Self::Retired,
            ]),
            Self::UnderConversion => transitions.extend([
                Self::Deployed,
                Self::InInventory,
                Self::UnderMaintenance,
                Self::UnderRepair,
            ]),
            Self::Retired => transitions.extend([
                Self::InInventory,
                Self::Disposed,
                Self::Sold,
                Self::Archived,
            ]),
            Self::Disposed | Self::Sold => transitions.push(Self::Archived),
            Self::LostStolen => {
                transitions.extend([Self::InInventory, Self::Retired, Self::Archived])
            }
            Self::Archived => transitions.push(Self::InInventory),
        }

        transitions
    }

    /// Check if this is a terminal state (no further transitions possible)
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Disposed | Self::Archived | Self::Sold)
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
            Self::Planning => "Rent Out",
            Self::Procurement => "Procurement",
            Self::Received => "Received",
            Self::InInventory => "In Inventory",
            Self::Deployed => "In Use",
            Self::RentedOut => "Rented Out",
            Self::UnderMaintenance => "Under Maintenance",
            Self::UnderRepair => "Under Repair",
            Self::UnderConversion => "Under Conversion",
            Self::Retired => "Retired",
            Self::Disposed => "Disposed",
            Self::Sold => "Sold",
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
            Self::Sold => "lime",
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

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }
}

impl FromStr for ConversionType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "function_change" => Ok(Self::FunctionChange),
            "upgrade" => Ok(Self::Upgrade),
            "downgrade" => Ok(Self::Downgrade),
            "customization" => Ok(Self::Customization),
            "repurposing" => Ok(Self::Repurposing),
            _ => Err(format!("Invalid conversion type: {}", s)),
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

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }
}

impl FromStr for ConversionStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            _ => Err(format!("Invalid conversion status: {}", s)),
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
