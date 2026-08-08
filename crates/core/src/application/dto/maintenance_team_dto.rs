//! Maintenance Team DTOs

use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

/// Request payload for creating a team member
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTeamMemberRequest {
    pub user_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub member_name: String,
    #[serde(default = "default_member_role")]
    pub role_in_team: String,
}

fn default_member_role() -> String {
    "Technician".to_string()
}

/// Request payload for creating a Maintenance Team
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMaintenanceTeamRequest {
    pub team_code: String,
    pub team_name: String,
    pub company_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub manager_name: Option<String>,
    pub description: Option<String>,
    #[serde(default)]
    pub members: Vec<CreateTeamMemberRequest>,
}

/// Request payload for updating a Maintenance Team
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMaintenanceTeamRequest {
    pub team_code: Option<String>,
    pub team_name: Option<String>,
    pub company_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub manager_name: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub members: Option<Vec<CreateTeamMemberRequest>>,
}

/// Query parameters for filtering Maintenance Teams
#[derive(Debug, Clone, Serialize, Deserialize, IntoParams)]
pub struct MaintenanceTeamQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub company_id: Option<Uuid>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}
