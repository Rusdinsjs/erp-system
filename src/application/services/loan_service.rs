//! Loan Service

use chrono::Utc;
use uuid::Uuid;

use crate::application::dto::CreateLoanRequest;
use crate::domain::entities::{Loan, LoanStatus};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, LoanRepository};

#[derive(Clone)]
pub struct LoanService {
    loan_repo: LoanRepository,
    asset_repo: AssetRepository,
    notification_service: crate::application::services::NotificationService,
}

impl LoanService {
    pub fn new(
        loan_repo: LoanRepository,
        asset_repo: AssetRepository,
        notification_service: crate::application::services::NotificationService,
    ) -> Self {
        Self {
            loan_repo,
            asset_repo,
            notification_service,
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

        // Optional: Notify admins here

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

        // Notify Borrower
        let asset = self
            .asset_repo
            .find_by_id(updated_loan.asset_id)
            .await
            .ok()
            .flatten();
        let asset_name = asset
            .map(|a| a.name)
            .unwrap_or_else(|| "Unknown Asset".to_string());

        if let Some(borrower_id) = updated_loan.borrower_id {
            let _ = self
                .notification_service
                .notify_loan_approved(borrower_id, &asset_name, updated_loan.id)
                .await;
        }

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
        let asset = self
            .asset_repo
            .find_by_id(updated_loan.asset_id)
            .await
            .ok()
            .flatten();
        let asset_name = asset
            .map(|a| a.name)
            .unwrap_or_else(|| "Unknown Asset".to_string());

        if let Some(borrower_id) = updated_loan.borrower_id {
            let _ = self
                .notification_service
                .create(
                    borrower_id,
                    &format!("Loan Rejected: {}", asset_name),
                    &format!(
                        "Your loan request for {} has been rejected. Reason: {}",
                        asset_name,
                        reason.unwrap_or_else(|| "No reason provided".to_string())
                    ),
                    Some("loan"),
                    Some(updated_loan.id),
                )
                .await;
        }

        Ok(updated_loan)
    }

    /// Checkout loan
    pub async fn checkout(
        &self,
        id: Uuid,
        checked_out_by: Uuid,
        condition: &str,
    ) -> DomainResult<Loan> {
        let loan = self.get_by_id(id).await?;

        if !loan.can_checkout() {
            return Err(DomainError::business_rule(
                "loan_checkout",
                "Loan cannot be checked out in current state",
            ));
        }

        self.loan_repo
            .checkout(id, checked_out_by, condition)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Update asset status
        let _ = self.asset_repo.update_status(loan.asset_id, "in_use").await;

        self.get_by_id(id).await
    }

    /// Return/checkin loan
    pub async fn checkin(
        &self,
        id: Uuid,
        checked_in_by: Uuid,
        condition: &str,
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
            .checkin(id, checked_in_by, condition, return_date)
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

        self.get_by_id(id).await
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
        // Placeholder for background logic
        Ok(())
    }
}
