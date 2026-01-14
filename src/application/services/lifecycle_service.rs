//! Lifecycle Service
//!
//! Business logic for asset lifecycle state transitions.

use serde_json::json;
use uuid::Uuid;

use crate::domain::entities::{AssetState, LifecycleHistory};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::LifecycleRepository;

#[derive(Clone)]
pub struct LifecycleService {
    repository: LifecycleRepository,
}

/// Result of a transition request
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type")]
pub enum TransitionResult {
    /// Transition executed immediately
    Executed { history: LifecycleHistory },
    /// Transition requires approval
    ApprovalRequired {
        approval_request_id: Uuid,
        message: String,
    },
}

/// Approval level for transitions
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ApprovalLevel {
    /// No approval needed
    None,
    /// Supervisor (L1) approval
    Supervisor,
    /// Manager (L2) approval
    Manager,
}

impl LifecycleService {
    pub fn new(repository: LifecycleRepository) -> Self {
        Self { repository }
    }

    /// Check if a transition requires approval
    pub fn requires_approval(target_state: &AssetState) -> bool {
        matches!(
            target_state,
            AssetState::Deployed
                | AssetState::UnderConversion
                | AssetState::Retired
                | AssetState::Disposed
                | AssetState::LostStolen
        )
    }

    /// Get the approval level required for a transition
    pub fn get_approval_level(target_state: &AssetState) -> ApprovalLevel {
        match target_state {
            // Manager approval (L2) for critical transitions
            AssetState::Retired
            | AssetState::Disposed
            | AssetState::UnderConversion
            | AssetState::LostStolen => ApprovalLevel::Manager,
            // Supervisor approval (L1) for deployment
            AssetState::Deployed => ApprovalLevel::Supervisor,
            // No approval for other states
            _ => ApprovalLevel::None,
        }
    }

    /// Request a transition (may require approval)
    /// Returns approval_request_id if approval is needed, None if executed immediately
    pub async fn request_transition(
        &self,
        asset_id: Uuid,
        target_state: &str,
        reason: Option<String>,
        requested_by: Uuid,
    ) -> DomainResult<TransitionRequestResult> {
        // Get current status
        let current_status = self.repository.get_asset_status(asset_id).await?;

        // Parse states
        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid current state: {}", current_status))
        })?;

        let new_state = AssetState::from_str(target_state).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid target state: {}", target_state))
        })?;

        // Validate transition
        if !current_state.can_transition_to(&new_state) {
            return Err(DomainError::business_rule(
                "Lifecycle",
                &format!(
                    "Cannot transition from {} to {}. Valid transitions: {:?}",
                    current_state.display_name(),
                    new_state.display_name(),
                    current_state
                        .valid_transitions()
                        .iter()
                        .map(|s| s.display_name())
                        .collect::<Vec<_>>()
                ),
            ));
        }

        // Check if approval is required
        if Self::requires_approval(&new_state) {
            let approval_level = Self::get_approval_level(&new_state);
            let level_num = match approval_level {
                ApprovalLevel::Supervisor => 1,
                ApprovalLevel::Manager => 2,
                ApprovalLevel::None => 0,
            };

            // Create approval request data
            let data = json!({
                "asset_id": asset_id,
                "from_state": current_state.as_str(),
                "to_state": new_state.as_str(),
                "reason": reason,
                "approval_level": level_num
            });

            Ok(TransitionRequestResult::RequiresApproval {
                from_state: current_state.as_str().to_string(),
                to_state: new_state.as_str().to_string(),
                data,
                requested_by,
            })
        } else {
            // Execute immediately
            let history = self
                .execute_transition(
                    asset_id,
                    &current_state,
                    &new_state,
                    reason,
                    Some(requested_by),
                )
                .await?;

            Ok(TransitionRequestResult::Executed { history })
        }
    }

    /// Execute a transition directly (used after approval or for non-approval transitions)
    pub async fn execute_transition(
        &self,
        asset_id: Uuid,
        from_state: &AssetState,
        to_state: &AssetState,
        reason: Option<String>,
        performed_by: Option<Uuid>,
    ) -> DomainResult<LifecycleHistory> {
        // Update asset status
        self.repository
            .update_asset_status(asset_id, to_state.as_str())
            .await?;

        // Record in history
        let history = self
            .repository
            .record_transition(asset_id, from_state, to_state, reason, performed_by, None)
            .await?;

        Ok(history)
    }

    /// Execute an approved transition (called by approval service)
    pub async fn execute_approved_transition(
        &self,
        asset_id: Uuid,
        from_state_str: &str,
        to_state_str: &str,
        reason: Option<String>,
        approved_by: Uuid,
    ) -> DomainResult<LifecycleHistory> {
        let from_state = AssetState::from_str(from_state_str).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid from state: {}", from_state_str))
        })?;

        let to_state = AssetState::from_str(to_state_str).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid to state: {}", to_state_str))
        })?;

        // Verify current state matches expected from_state
        let current_status = self.repository.get_asset_status(asset_id).await?;
        if current_status != from_state_str {
            return Err(DomainError::business_rule(
                "Lifecycle",
                &format!(
                    "Asset state has changed. Expected '{}', but current is '{}'. Please create a new transition request.",
                    from_state_str, current_status
                ),
            ));
        }

        self.execute_transition(asset_id, &from_state, &to_state, reason, Some(approved_by))
            .await
    }

    /// Legacy method - Transition an asset to a new state with validation (direct execution)
    pub async fn transition_asset(
        &self,
        asset_id: Uuid,
        target_state: &str,
        reason: Option<String>,
        performed_by: Option<Uuid>,
    ) -> DomainResult<LifecycleHistory> {
        // Get current status
        let current_status = self.repository.get_asset_status(asset_id).await?;

        // Parse states
        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid current state: {}", current_status))
        })?;

        let new_state = AssetState::from_str(target_state).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid target state: {}", target_state))
        })?;

        // Validate transition
        if !current_state.can_transition_to(&new_state) {
            return Err(DomainError::business_rule(
                "Lifecycle",
                &format!(
                    "Cannot transition from {} to {}. Valid transitions: {:?}",
                    current_state.display_name(),
                    new_state.display_name(),
                    current_state
                        .valid_transitions()
                        .iter()
                        .map(|s| s.display_name())
                        .collect::<Vec<_>>()
                ),
            ));
        }

        self.execute_transition(asset_id, &current_state, &new_state, reason, performed_by)
            .await
    }

    /// Get valid transitions for an asset with approval info
    pub async fn get_valid_transitions_with_approval(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<Vec<StateInfoWithApproval>> {
        let current_status = self.repository.get_asset_status(asset_id).await?;

        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid state: {}", current_status))
        })?;

        Ok(current_state
            .valid_transitions()
            .into_iter()
            .map(|s| {
                let requires_approval = Self::requires_approval(&s);
                let approval_level = Self::get_approval_level(&s);
                StateInfoWithApproval {
                    value: s.as_str().to_string(),
                    label: s.display_name().to_string(),
                    color: s.color().to_string(),
                    is_terminal: s.is_terminal(),
                    requires_approval,
                    approval_level: match approval_level {
                        ApprovalLevel::None => 0,
                        ApprovalLevel::Supervisor => 1,
                        ApprovalLevel::Manager => 2,
                    },
                }
            })
            .collect())
    }

    /// Get valid transitions for an asset
    pub async fn get_valid_transitions(&self, asset_id: Uuid) -> DomainResult<Vec<AssetState>> {
        let current_status = self.repository.get_asset_status(asset_id).await?;

        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid state: {}", current_status))
        })?;

        Ok(current_state.valid_transitions())
    }

    /// Get lifecycle history for an asset
    pub async fn get_history(&self, asset_id: Uuid) -> DomainResult<Vec<LifecycleHistory>> {
        self.repository.get_history(asset_id).await
    }

    /// Get current status of an asset
    pub async fn get_current_status(&self, asset_id: Uuid) -> DomainResult<StateInfo> {
        let current_status = self.repository.get_asset_status(asset_id).await?;
        let current_state = AssetState::from_str(&current_status).unwrap_or(AssetState::Planning);

        Ok(StateInfo {
            value: current_state.as_str().to_string(),
            label: current_state.display_name().to_string(),
            color: current_state.color().to_string(),
            is_terminal: current_state.is_terminal(),
        })
    }

    /// Get all available states with metadata
    pub fn get_all_states() -> Vec<StateInfo> {
        vec![
            AssetState::Planning,
            AssetState::Procurement,
            AssetState::Received,
            AssetState::InInventory,
            AssetState::Deployed,
            AssetState::UnderMaintenance,
            AssetState::UnderRepair,
            AssetState::UnderConversion,
            AssetState::Retired,
            AssetState::Disposed,
            AssetState::LostStolen,
            AssetState::Archived,
        ]
        .into_iter()
        .map(|s| StateInfo {
            value: s.as_str().to_string(),
            label: s.display_name().to_string(),
            color: s.color().to_string(),
            is_terminal: s.is_terminal(),
        })
        .collect()
    }
}

/// Result of requesting a transition
#[derive(Debug, Clone)]
pub enum TransitionRequestResult {
    /// Transition executed immediately
    Executed { history: LifecycleHistory },
    /// Approval is required
    RequiresApproval {
        from_state: String,
        to_state: String,
        data: serde_json::Value,
        requested_by: Uuid,
    },
}

/// State information for frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct StateInfo {
    pub value: String,
    pub label: String,
    pub color: String,
    pub is_terminal: bool,
}

/// State information with approval details
#[derive(Debug, Clone, serde::Serialize)]
pub struct StateInfoWithApproval {
    pub value: String,
    pub label: String,
    pub color: String,
    pub is_terminal: bool,
    pub requires_approval: bool,
    pub approval_level: i32,
}
