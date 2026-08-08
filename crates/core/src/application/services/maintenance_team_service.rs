//! Maintenance Team Application Service

use uuid::Uuid;

use crate::application::dto::{
    CreateMaintenanceTeamRequest, CreateTeamMemberRequest, MaintenanceTeamQuery, PaginatedResponse,
    UpdateMaintenanceTeamRequest,
};
use crate::domain::entities::{MaintenanceTeam, MaintenanceTeamDetail, MaintenanceTeamMember};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::MaintenanceTeamRepository;

#[derive(Clone)]
pub struct MaintenanceTeamService {
    repo: MaintenanceTeamRepository,
}

impl MaintenanceTeamService {
    pub fn new(repo: MaintenanceTeamRepository) -> Self {
        Self { repo }
    }

    /// Search/list maintenance teams with pagination
    pub async fn list(
        &self,
        query: MaintenanceTeamQuery,
    ) -> DomainResult<PaginatedResponse<MaintenanceTeamDetail>> {
        let page = query.page.unwrap_or(1).max(1);
        let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let teams = self
            .repo
            .find_all(
                query.search.as_deref(),
                query.status.as_deref(),
                query.company_id,
                per_page,
                offset,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let total = self
            .repo
            .count(
                query.search.as_deref(),
                query.status.as_deref(),
                query.company_id,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(PaginatedResponse::new(teams, total, page, per_page))
    }

    /// Get team by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<MaintenanceTeamDetail> {
        self.repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::NotFound {
                entity: "MaintenanceTeam".to_string(),
                id: id.to_string(),
            })
    }

    /// Create team with members
    pub async fn create(&self, req: CreateMaintenanceTeamRequest) -> DomainResult<MaintenanceTeamDetail> {
        if req.team_name.trim().is_empty() {
            return Err(DomainError::ValidationError {
                field: "team_name".to_string(),
                message: "Team name cannot be empty".to_string(),
            });
        }
        if req.team_code.trim().is_empty() {
            return Err(DomainError::ValidationError {
                field: "team_code".to_string(),
                message: "Team code cannot be empty".to_string(),
            });
        }

        let team = self
            .repo
            .create(
                &req.team_code,
                &req.team_name,
                req.company_id,
                req.manager_id,
                req.manager_name.as_deref(),
                req.description.as_deref(),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        for m in req.members {
            if !m.member_name.trim().is_empty() {
                let _ = self
                    .repo
                    .add_member(
                        team.id,
                        m.user_id,
                        m.employee_id,
                        &m.member_name,
                        &m.role_in_team,
                    )
                    .await;
            }
        }

        self.get_by_id(team.id).await
    }

    /// Update team
    pub async fn update(
        &self,
        id: Uuid,
        req: UpdateMaintenanceTeamRequest,
    ) -> DomainResult<MaintenanceTeamDetail> {
        let _existing = self.get_by_id(id).await?;

        self.repo
            .update(
                id,
                req.team_code.as_deref(),
                req.team_name.as_deref(),
                req.company_id,
                req.manager_id,
                req.manager_name.as_deref(),
                req.status.as_deref(),
                req.description.as_deref(),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if let Some(members) = req.members {
            // Replace members: delete existing and add new
            let current_members = self
                .repo
                .find_members_by_team_id(id)
                .await
                .unwrap_or_default();
            for cm in current_members {
                let _ = self.repo.remove_member(cm.id).await;
            }
            for m in members {
                if !m.member_name.trim().is_empty() {
                    let _ = self
                        .repo
                        .add_member(id, m.user_id, m.employee_id, &m.member_name, &m.role_in_team)
                        .await;
                }
            }
        }

        self.get_by_id(id).await
    }

    /// Add a single member
    pub async fn add_member(
        &self,
        team_id: Uuid,
        req: CreateTeamMemberRequest,
    ) -> DomainResult<MaintenanceTeamMember> {
        let _existing = self.get_by_id(team_id).await?;

        if req.member_name.trim().is_empty() {
            return Err(DomainError::ValidationError {
                field: "member_name".to_string(),
                message: "Member name cannot be empty".to_string(),
            });
        }

        self.repo
            .add_member(
                team_id,
                req.user_id,
                req.employee_id,
                &req.member_name,
                &req.role_in_team,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Remove a member
    pub async fn remove_member(&self, member_id: Uuid) -> DomainResult<bool> {
        self.repo
            .remove_member(member_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete team
    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repo
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
