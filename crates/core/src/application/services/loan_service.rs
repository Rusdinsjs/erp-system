//! Loan Service

use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use crate::application::dto::CreateLoanRequest;
use crate::application::services::approval_service::ModuleApprovalCallback;
use crate::domain::entities::{Loan, LoanStatus};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, LoanRepository};

#[derive(Clone)]
pub struct LoanService {
    loan_repo: LoanRepository,
    asset_repo: AssetRepository,
    event_bus: crate::infrastructure::bus::EventBus,
}

impl LoanService {
    pub fn new(
        loan_repo: LoanRepository,
        asset_repo: AssetRepository,
        event_bus: crate::infrastructure::bus::EventBus,
    ) -> Self {
        Self {
            loan_repo,
            asset_repo,
            event_bus,
        }
    }

    /// Create loan request
    pub async fn create(&self, request: CreateLoanRequest) -> DomainResult<Loan> {
        // Check if asset exists and is available
        let asset = self
            .asset_repo
            .find_by_id(request.asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", request.asset_id))?;

        if !asset.is_available() {
            return Err(DomainError::business_rule(
                "asset_availability",
                "Asset is not available for loan",
            ));
        }

        let mut loan = Loan::new(
            request.asset_id,
            request.borrower_id,
            request.employee_id,
            request.loan_date,
            request.expected_return_date,
        );
        loan.deposit_amount = request.deposit_amount;

        let created_loan =
            self.loan_repo
                .create(&loan)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        // Publish Event
        self.event_bus
            .publish(crate::domain::events::SystemEvent::BusinessEvent {
                event_name: "LoanRequested".to_string(),
                payload: serde_json::json!({
                    "loan_id": created_loan.id,
                    "asset_id": created_loan.asset_id,
                    "asset_name": asset.name,
                    "borrower_id": Some(created_loan.borrower_id)
                }),
            });

        Ok(created_loan)
    }

    /// Get loan by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<Loan> {
        self.loan_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Loan", id))
    }

    /// List loans
    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<Loan>> {
        let offset = (page - 1) * per_page;
        self.loan_repo
            .list(per_page, offset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List overdue loans
    pub async fn list_overdue(&self) -> DomainResult<Vec<Loan>> {
        self.loan_repo
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List loans by user
    pub async fn list_by_user(&self, user_id: Uuid) -> DomainResult<Vec<Loan>> {
        self.loan_repo.list_by_borrower(user_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// List loans by asset
    pub async fn list_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<Loan>> {
        self.loan_repo.list_by_asset(asset_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// Approve loan
    pub async fn approve(&self, id: Uuid, approver_id: Uuid) -> DomainResult<Loan> {
        let loan = self.get_by_id(id).await?;

        if loan.status != LoanStatus::Requested.as_str() {
            return Err(DomainError::business_rule(
                "loan_status",
                "Can only approve loans with 'requested' status",
            ));
        }

        self.loan_repo.approve(id, approver_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        let updated_loan = self.get_by_id(id).await?;

        // Get asset info for event
        let asset_name = self
            .asset_repo
            .find_by_id(updated_loan.asset_id)
            .await
            .ok()
            .flatten()
            .map(|a| a.name)
            .unwrap_or_else(|| "Unknown Asset".to_string());

        // Publish Event
        self.event_bus
            .publish(crate::domain::events::SystemEvent::BusinessEvent {
                event_name: "LoanApproved".to_string(),
                payload: serde_json::json!({
                    "loan_id": updated_loan.id,
                    "asset_id": updated_loan.asset_id,
                    "asset_name": asset_name,
                    "borrower_id": updated_loan.borrower_id,
                }),
            });

        Ok(updated_loan)
    }

    /// Reject loan request
    pub async fn reject(&self, id: Uuid, reason: Option<String>) -> DomainResult<Loan> {
        let loan = self.get_by_id(id).await?;

        if loan.status != LoanStatus::Requested.as_str() {
            return Err(DomainError::business_rule(
                "loan_status",
                "Can only reject loans with 'requested' status",
            ));
        }

        self.loan_repo
            .reject(id, reason.as_deref())
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let updated_loan = self.get_by_id(id).await?;

        // Notify Borrower
        // Get asset info for event
        let asset_name = self
            .asset_repo
            .find_by_id(updated_loan.asset_id)
            .await
            .ok()
            .flatten()
            .map(|a| a.name)
            .unwrap_or_else(|| "Unknown Asset".to_string());

        // Publish Event
        self.event_bus
            .publish(crate::domain::events::SystemEvent::BusinessEvent {
                event_name: "LoanRejected".to_string(),
                payload: serde_json::json!({
                    "loan_id": updated_loan.id,
                    "asset_id": updated_loan.asset_id,
                    "asset_name": asset_name,
                    "borrower_id": updated_loan.borrower_id,
                    "reason": reason,
                }),
            });

        Ok(updated_loan)
    }

    pub async fn checkout(
        &self,
        id: Uuid,
        checked_out_by: Uuid,
        condition: &str,
        photos: Option<Vec<String>>,
    ) -> DomainResult<Loan> {
        let loan = self.get_by_id(id).await?;

        if !loan.can_checkout() {
            return Err(DomainError::business_rule(
                "loan_checkout",
                "Loan cannot be checked out in current state",
            ));
        }

        self.loan_repo
            .checkout(id, checked_out_by, condition, photos)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Update asset status
        let _ = self.asset_repo.update_status(loan.asset_id, "in_use").await;

        let updated_loan = self.get_by_id(id).await?;

        // Publish Event
        self.event_bus
            .publish(crate::domain::events::SystemEvent::BusinessEvent {
                event_name: "LoanCheckedOut".to_string(),
                payload: serde_json::json!({
                    "loan_id": updated_loan.id,
                    "asset_id": updated_loan.asset_id,
                    "borrower_id": updated_loan.borrower_id,
                }),
            });

        Ok(updated_loan)
    }

    pub async fn checkin(
        &self,
        id: Uuid,
        checked_in_by: Uuid,
        condition: &str,
        photos: Option<Vec<String>>,
    ) -> DomainResult<Loan> {
        let loan = self.get_by_id(id).await?;

        if !loan.can_return() {
            return Err(DomainError::business_rule(
                "loan_return",
                "Loan cannot be returned in current state",
            ));
        }

        let return_date = Utc::now().date_naive();
        self.loan_repo
            .checkin(id, checked_in_by, condition, photos, return_date)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Update asset status back to available
        let _ = self
            .asset_repo
            .update_status(loan.asset_id, "in_inventory")
            .await;

        let updated_loan = self.get_by_id(id).await?;

        // Publish Event
        self.event_bus
            .publish(crate::domain::events::SystemEvent::BusinessEvent {
                event_name: "LoanReturned".to_string(),
                payload: serde_json::json!({
                    "loan_id": updated_loan.id,
                    "asset_id": updated_loan.asset_id,
                    "borrower_id": updated_loan.borrower_id,
                }),
            });

        Ok(updated_loan)
    }

    /// List loans by employee
    pub async fn list_by_employee(&self, employee_id: Uuid) -> DomainResult<Vec<Loan>> {
        self.loan_repo
            .list_by_employee(employee_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Check and update overdue loans (Background Task)
    pub async fn check_overdue_loans(&self) -> DomainResult<()> {
        let overdue_loans =
            self.loan_repo
                .list_overdue()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        for loan in overdue_loans {
            if let Some(borrower_id) = loan.borrower_id {
                let asset = self
                    .asset_repo
                    .find_by_id(loan.asset_id)
                    .await
                    .ok()
                    .flatten();
                let asset_name = asset
                    .map(|a| a.name)
                    .unwrap_or_else(|| "Unknown Asset".to_string());

                let now = Utc::now().date_naive();
                let days_overdue = (now - loan.expected_return_date).num_days();

                if days_overdue > 0 {
                    self.event_bus
                        .publish(crate::domain::events::SystemEvent::BusinessEvent {
                            event_name: "LoanOverdue".to_string(),
                            payload: serde_json::json!({
                                "loan_id": loan.id,
                                "borrower_id": Some(borrower_id),
                                "asset_name": asset_name,
                                "days_overdue": days_overdue,
                            }),
                        });
                }
            }
        }
        Ok(())
    }

    pub async fn get_analytics(
        &self,
    ) -> DomainResult<crate::infrastructure::repositories::LoanAnalyticsData> {
        self.loan_repo
            .get_analytics()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}

/// ModuleApprovalCallback implementation for LoanService
#[async_trait]
impl ModuleApprovalCallback for LoanService {
    async fn on_final_approval(
        &self,
        request: &crate::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        _notes: Option<String>,
    ) -> DomainResult<()> {
        // Get the loan ID from the approval request
        let loan_id = request.resource_id;

        // Approve the loan
        self.approve(loan_id, approver_id).await?;

        Ok(())
    }

    async fn on_rejection(
        &self,
        request: &crate::infrastructure::repositories::ApprovalRequest,
        _approver_id: Uuid,
        notes: String,
    ) -> DomainResult<()> {
        let loan_id = request.resource_id;

        // Reject the loan
        self.reject(loan_id, Some(notes)).await?;

        Ok(())
    }

    fn module_name(&self) -> &'static str {
        "loan"
    }
}
