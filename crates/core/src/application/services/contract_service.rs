use async_trait::async_trait;
use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::application::dto::contract_dto::{
    ContractDetailResponse, ContractPerformanceResponse, ContractResponse, CreateContractRequest,
    DelegateApprovalRequest, RenewalOptionsResponse, RenewalRequest, RenewalResponse,
    UpdateContractRequest,
};
use crate::application::services::approval_service::ModuleApprovalCallback;
use crate::domain::entities::{ContractApproval, ContractRenewal, RentalContract};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{
    ContractApprovalRepository, ContractDocumentRepository, ContractRenewalRepository,
    ContractRepository, RentalRepository,
};

#[derive(Clone)]
pub struct ContractService {
    contract_repo: Arc<ContractRepository>,
    document_repo: Arc<ContractDocumentRepository>,
    renewal_repo: Arc<ContractRenewalRepository>,
    approval_repo: Arc<ContractApprovalRepository>,
    rental_repo: Arc<RentalRepository>,
    notification_service: crate::application::services::NotificationService,
    email_service: crate::application::services::EmailService,
    approval_workflow_service: crate::application::services::ApprovalWorkflowService,
}

impl ContractService {
    pub fn new(
        pool: PgPool,
        notification_service: crate::application::services::NotificationService,
        email_service: crate::application::services::EmailService,
        approval_workflow_service: crate::application::services::ApprovalWorkflowService,
    ) -> Self {
        Self {
            contract_repo: Arc::new(ContractRepository::new(pool.clone())),
            document_repo: Arc::new(ContractDocumentRepository::new(pool.clone())),
            renewal_repo: Arc::new(ContractRenewalRepository::new(pool.clone())),
            approval_repo: Arc::new(ContractApprovalRepository::new(pool.clone())),
            rental_repo: Arc::new(RentalRepository::new(pool)),
            notification_service,
            email_service,
            approval_workflow_service,
        }
    }

    /// Create a new contract
    pub async fn create_contract(
        &self,
        request: CreateContractRequest,
        user_id: Uuid,
    ) -> DomainResult<ContractResponse> {
        // Generate contract number using repository method
        let year = Utc::now()
            .format("%Y")
            .to_string()
            .parse::<i32>()
            .map_err(|e| DomainError::internal(format!("Failed to parse current year: {}", e)))?;
        let sequence = self.contract_repo.get_next_sequence(year).await?;
        let contract_number = format!("CNT-{}-{:04}", year, sequence);

        // Check for active approval workflow
        let total_approval_steps = match self
            .approval_workflow_service
            .get_active_workflow("contract")
            .await
        {
            Ok(Some(wf)) => wf.approval_levels,
            _ => 2, // Default to 2 levels
        };

        let contract = RentalContract {
            id: Uuid::new_v4(),
            contract_number,
            client_id: request.client_id,
            client_name: None,
            start_date: request.start_date,
            end_date: request.end_date,
            auto_renew: Some(request.auto_renew.unwrap_or(false)),
            renewal_notice_days: Some(request.renewal_notice_days.unwrap_or(30)),
            payment_terms: Some(
                request
                    .payment_terms
                    .unwrap_or_else(|| "net_30".to_string()),
            ),
            price_lock: Some(request.price_lock.unwrap_or(false)),
            status: "draft".to_string(),
            contract_file_url: None,
            notes: request.notes,
            created_at: Some(Utc::now()),
            created_by: Some(user_id),
            updated_at: None,
            updated_by: None,
            submitted_for_approval_at: None,
            approved_at: None,
            approved_by: None,
            terminated_at: None,
            terminated_by: None,
            termination_reason: None,
            current_approval_step: 0,
            total_approval_steps,
            template_id: request.template_id,
            delegated_to: None,
        };

        let created = self.contract_repo.create(&contract).await?;
        Ok(self.to_response(created))
    }

    /// Get contract by ID
    pub async fn get_contract(&self, id: Uuid) -> DomainResult<ContractResponse> {
        let contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;
        Ok(self.to_response(contract))
    }

    /// Get contract detail with performance and documents
    pub async fn get_contract_detail(&self, id: Uuid) -> DomainResult<ContractDetailResponse> {
        let contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        // Get related rentals
        let rentals = self
            .rental_repo
            .find_by_contract_id(id)
            .await
            .unwrap_or_default();

        // Calculate performance metrics
        let performance = self.calculate_performance(&rentals);

        // Get documents count
        let documents = self
            .document_repo
            .find_by_contract_id(id)
            .await
            .unwrap_or_default();
        let documents_count = documents.len();

        // Convert rentals to DTOs
        let related_rentals = rentals
            .into_iter()
            .map(|r| {
                let asset_name = r
                    .items
                    .as_ref()
                    .and_then(|items| items.first().and_then(|i| i.asset_name.clone()));
                let asset_id = r
                    .items
                    .as_ref()
                    .and_then(|items| items.first().map(|i| i.asset_id))
                    .unwrap_or(Uuid::nil());

                crate::application::dto::rental_dto::RentalResponse {
                    id: r.id,
                    rental_number: r.rental_number.clone(),
                    asset_id,
                    asset_name,
                    client_id: r.client_id,
                    client_name: r.client_name.clone(),
                    status: r.status.clone(),
                    request_date: r.request_date,
                    start_date: r.start_date,
                    expected_end_date: r.expected_end_date,
                    actual_end_date: r.actual_end_date,
                    daily_rate: None,
                    total_days: None,
                    subtotal: r.subtotal,
                    deposit_amount: r.deposit_amount,
                    penalty_amount: r.penalty_amount,
                    total_amount: r.total_amount,
                    notes: r.notes.clone(),
                    is_overdue: r.is_overdue(),
                }
            })
            .collect();

        Ok(ContractDetailResponse {
            contract: self.to_response(contract),
            performance,
            documents_count,
            related_rentals,
        })
    }

    /// List all contracts
    pub async fn list_contracts(&self) -> DomainResult<Vec<ContractResponse>> {
        let contracts = self.contract_repo.find_all().await?;
        Ok(contracts.into_iter().map(|c| self.to_response(c)).collect())
    }

    /// List expiring contracts (within 90 days)
    pub async fn list_expiring(&self) -> DomainResult<Vec<ContractResponse>> {
        let contracts = self.contract_repo.find_expiring_soon(90).await?;
        Ok(contracts.into_iter().map(|c| self.to_response(c)).collect())
    }

    /// Get count of contracts pending approval
    pub async fn get_pending_approvals_count(&self) -> DomainResult<i64> {
        self.contract_repo.count_pending_approvals().await
    }

    /// Update contract
    pub async fn update_contract(
        &self,
        id: Uuid,
        request: UpdateContractRequest,
        user_id: Uuid,
    ) -> DomainResult<ContractResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        // Update fields if provided
        if let Some(start_date) = request.start_date {
            contract.start_date = start_date;
        }
        if let Some(end_date) = request.end_date {
            contract.end_date = end_date;
        }
        if let Some(auto_renew) = request.auto_renew {
            contract.auto_renew = Some(auto_renew);
        }
        if let Some(renewal_notice_days) = request.renewal_notice_days {
            contract.renewal_notice_days = Some(renewal_notice_days);
        }
        if let Some(payment_terms) = request.payment_terms {
            contract.payment_terms = Some(payment_terms);
        }
        if let Some(price_lock) = request.price_lock {
            contract.price_lock = Some(price_lock);
        }
        if let Some(status) = request.status {
            contract.status = status;
        }
        if let Some(contract_file_url) = request.contract_file_url {
            contract.contract_file_url = Some(contract_file_url);
        }
        if let Some(notes) = request.notes {
            contract.notes = Some(notes);
        }

        contract.updated_at = Some(Utc::now());
        contract.updated_by = Some(user_id);

        let updated = self.contract_repo.update(id, &contract, user_id).await?;
        Ok(self.to_response(updated))
    }

    /// Submit contract for approval
    pub async fn submit_for_approval(
        &self,
        id: Uuid,
        user_id: Uuid,
    ) -> DomainResult<ContractResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        // Validate status transition
        if contract.status != "draft" {
            return Err(DomainError::validation(
                "status",
                "Only draft contracts can be submitted for approval",
            ));
        }

        contract.status = "pending_approval".to_string();
        contract.submitted_for_approval_at = Some(Utc::now());
        contract.current_approval_step = 1; // Start at level 1
        contract.updated_at = Some(Utc::now());
        contract.updated_by = Some(user_id);

        let updated = self.contract_repo.update(id, &contract, user_id).await?;

        // Create approval history record
        let approval =
            ContractApproval::new(id, Some(user_id), "submitted".to_string(), None, 1, None);
        self.approval_repo.create(&approval).await?;

        // Notify Admins
        let _ = self
            .notification_service
            .create(
                user_id, // This is sender, but notify_admins handles recipients
                "Contract Submitted",
                &format!(
                    "Contract {} has been submitted for approval.",
                    contract.contract_number
                ),
                Some("contract"),
                Some(id),
            )
            .await;
        // In reality, next level approver should be notified specifically.
        // For MVP, we notify all admins.
        let _ = self
            .notification_service
            .notify_admins(
                "contract_approval_required",
                serde_json::json!({
                    "contract_number": contract.contract_number,
                    "step": 1
                }),
                Some("contract"),
                Some(id),
            )
            .await;

        // Send email notification to admins (TODO: fetch actual admin emails from database)
        // For now, using environment variable or default
        let admin_email =
            std::env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@example.com".to_string());
        let _ = self
            .email_service
            .send_contract_approval_notification(
                &admin_email,
                "Administrator",
                &contract.contract_number,
                1,
                contract.total_approval_steps,
                &id.to_string(),
            )
            .await;

        Ok(self.to_response(updated))
    }

    /// Approve contract
    pub async fn approve_contract(
        &self,
        id: Uuid,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<ContractResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        // Delegation check: If delegated, only the delegated user can approve
        if let Some(delegate_id) = contract.delegated_to {
            if delegate_id != approver_id {
                return Err(DomainError::unauthorized(
                    "This contract has been delegated to another user for approval",
                ));
            }
        }

        // Multi-level approval logic
        let current_step = contract.current_approval_step;
        let total_steps = contract.total_approval_steps;

        if current_step >= total_steps {
            contract.status = "active".to_string();
            contract.approved_at = Some(Utc::now());
            contract.approved_by = Some(approver_id);
        } else {
            // Move to next step
            contract.current_approval_step += 1;
            contract.status = "pending_approval".to_string();
        }

        contract.updated_at = Some(Utc::now());
        contract.updated_by = Some(approver_id);

        let updated = self
            .contract_repo
            .update(id, &contract, approver_id)
            .await?;

        // Create approval history record
        let approval = ContractApproval::new(
            id,
            Some(approver_id),
            "approved".to_string(),
            notes,
            current_step,
            None,
        );
        self.approval_repo.create(&approval).await?;

        // Notify Creator
        if let Some(creator_id) = contract.created_by {
            let _ = self
                .notification_service
                .create(
                    creator_id,
                    "Contract Approved",
                    &format!(
                        "Contract {} has been approved at level {}.",
                        contract.contract_number, current_step
                    ),
                    Some("contract"),
                    Some(id),
                )
                .await;
        }

        // If finalized, notify all admins
        if current_step >= total_steps {
            let _ = self
                .notification_service
                .notify_admins(
                    "contract_activated",
                    serde_json::json!({ "contract_number": contract.contract_number }),
                    Some("contract"),
                    Some(id),
                )
                .await;

            // Send email: Contract fully approved and activated
            let creator_email = std::env::var("CREATOR_EMAIL")
                .unwrap_or_else(|_| "creator@example.com".to_string());
            let _ = self
                .email_service
                .send_contract_activated_notification(
                    &creator_email,
                    "Contract Creator",
                    &contract.contract_number,
                )
                .await;
        } else {
            // Send email: Approved at current level, needs next level approval
            let creator_email = std::env::var("CREATOR_EMAIL")
                .unwrap_or_else(|_| "creator@example.com".to_string());
            let _ = self
                .email_service
                .send_contract_approved_notification(
                    &creator_email,
                    "Contract Creator",
                    &contract.contract_number,
                    current_step,
                    "Approver",
                )
                .await;

            // Notify next level approvers
            let admin_email =
                std::env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@example.com".to_string());
            let _ = self
                .email_service
                .send_contract_approval_notification(
                    &admin_email,
                    "Administrator",
                    &contract.contract_number,
                    contract.current_approval_step,
                    contract.total_approval_steps,
                    &id.to_string(),
                )
                .await;
        }

        Ok(self.to_response(updated))
    }

    /// Reject contract
    pub async fn reject_contract(
        &self,
        id: Uuid,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<ContractResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        // Delegation check: If delegated, only the delegated user can reject
        if let Some(delegate_id) = contract.delegated_to {
            if delegate_id != approver_id {
                return Err(DomainError::unauthorized(
                    "This contract has been delegated to another user",
                ));
            }
        }

        // Validate status transition
        if contract.status != "pending_approval" {
            return Err(DomainError::validation(
                "status",
                "Only pending contracts can be rejected",
            ));
        }

        contract.status = "draft".to_string();
        contract.submitted_for_approval_at = None;
        contract.current_approval_step = 0; // Reset steps
        contract.updated_at = Some(Utc::now());
        contract.updated_by = Some(approver_id);

        let updated = self
            .contract_repo
            .update(id, &contract, approver_id)
            .await?;

        // Create approval history record
        let approval = ContractApproval::new(
            id,
            Some(approver_id),
            "rejected".to_string(),
            notes.clone(),
            contract.current_approval_step,
            None,
        );
        self.approval_repo.create(&approval).await?;

        // Notify Creator
        if let Some(creator_id) = contract.created_by {
            let _ = self
                .notification_service
                .create(
                    creator_id,
                    "Contract Rejected",
                    &format!(
                        "Contract {} has been rejected. Reason: {}",
                        contract.contract_number,
                        notes
                            .clone()
                            .unwrap_or_else(|| "No reason provided".to_string())
                    ),
                    Some("contract"),
                    Some(id),
                )
                .await;

            // Send email notification about rejection
            let creator_email = std::env::var("CREATOR_EMAIL")
                .unwrap_or_else(|_| "creator@example.com".to_string());
            let _ = self
                .email_service
                .send_contract_rejected_notification(
                    &creator_email,
                    "Contract Creator",
                    &contract.contract_number,
                    contract.current_approval_step,
                    "Approver",
                    notes.as_deref(),
                )
                .await;
        }

        Ok(self.to_response(updated))
    }

    /// Bulk approve contracts
    pub async fn bulk_approve(
        &self,
        ids: Vec<Uuid>,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<Vec<ContractResponse>> {
        let mut results = Vec::new();
        for id in ids {
            match self.approve_contract(id, approver_id, notes.clone()).await {
                Ok(res) => results.push(res),
                Err(e) => return Err(e),
            }
        }
        Ok(results)
    }

    /// Bulk reject contracts
    pub async fn bulk_reject(
        &self,
        ids: Vec<Uuid>,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<Vec<ContractResponse>> {
        let mut results = Vec::new();
        for id in ids {
            match self.reject_contract(id, approver_id, notes.clone()).await {
                Ok(res) => results.push(res),
                Err(e) => return Err(e),
            }
        }
        Ok(results)
    }

    /// Delegate approval to another user
    pub async fn delegate_approval(
        &self,
        id: Uuid,
        user_id: Uuid,
        request: DelegateApprovalRequest,
    ) -> DomainResult<ContractResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id))?;

        if contract.status != "pending_approval" {
            return Err(DomainError::validation(
                "status",
                "Only contracts in pending_approval can be delegated",
            ));
        }

        contract.delegated_to = Some(request.delegated_to);
        contract.updated_at = Some(Utc::now());
        contract.updated_by = Some(user_id);

        let updated = self.contract_repo.update(id, &contract, user_id).await?;

        // Create delegation record in history
        let approval = ContractApproval::new(
            id,
            Some(user_id),
            "delegated".to_string(),
            request.notes,
            contract.current_approval_step,
            Some(request.delegated_to),
        );
        self.approval_repo.create(&approval).await?;

        // Notify delegated user
        let _ = self
            .notification_service
            .create(
                request.delegated_to,
                "Approval Delegated",
                &format!(
                    "Contract {} has been delegated to you for approval.",
                    contract.contract_number
                ),
                Some("contract"),
                Some(id),
            )
            .await;

        Ok(self.to_response(updated))
    }

    /// Get approval history for a contract
    pub async fn get_approval_history(
        &self,
        contract_id: Uuid,
    ) -> DomainResult<Vec<crate::application::dto::contract_dto::ApprovalResponse>> {
        self.approval_repo
            .find_by_contract_with_names(contract_id)
            .await
    }

    /// Get renewal options for a contract
    pub async fn get_renewal_options(&self, id: Uuid) -> DomainResult<RenewalOptionsResponse> {
        let contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id.to_string()))?;

        let today = Utc::now().naive_utc().date();
        let days_to_expiry = (contract.end_date - today).num_days();

        // Suggested end date is usually +1 year
        let suggested_end_date = contract.end_date + chrono::Duration::days(365);

        Ok(RenewalOptionsResponse {
            can_extend: contract.status == "active" || contract.status == "expiring",
            can_modify: contract.status == "active" || contract.status == "expiring",
            can_create_new: true,
            current_end_date: contract.end_date.to_string(),
            suggested_end_date: suggested_end_date.to_string(),
            expiring_in_days: days_to_expiry,
        })
    }

    // / Renew a contract
    pub async fn renew_contract(
        &self,
        id: Uuid,
        request: RenewalRequest,
        user_id: Uuid,
    ) -> DomainResult<RenewalResponse> {
        let mut contract = self
            .contract_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Contract", id.to_string()))?;
        let previous_end_date = contract.end_date;

        // Validate status
        if contract.status != "active"
            && contract.status != "expiring"
            && request.renewal_type != "new"
        {
            return Err(DomainError::bad_request(
                "Only active or expiring contracts can be renewed via extension/modification",
            ));
        }

        let new_end_date = if let Some(date_str) = request.new_end_date {
            chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").map_err(|_| {
                DomainError::bad_request("Invalid new_end_date format. Expected YYYY-MM-DD")
            })?
        } else {
            contract.end_date + chrono::Duration::days(365)
        };

        let mut renewal = ContractRenewal::new(
            contract.id,
            request.renewal_type.clone(),
            previous_end_date,
            new_end_date,
            Some(user_id),
        );
        renewal.notes = request.notes.clone();

        match request.renewal_type.as_str() {
            "extend" | "modify" => {
                contract.end_date = new_end_date;
                if let Some(auto_renew) = request.auto_renew {
                    contract.auto_renew = Some(auto_renew);
                }
                if let Some(price_lock) = request.price_lock {
                    contract.price_lock = Some(price_lock);
                }
                if let Some(terms) = request.payment_terms {
                    contract.payment_terms = Some(terms);
                }

                // If it was expiring, set it back to active if new date is far enough
                let today = Utc::now().naive_utc().date();
                if contract.status == "expiring"
                    && (new_end_date - today).num_days()
                        > (contract.renewal_notice_days.unwrap_or(30) as i64)
                {
                    contract.status = "active".to_string();
                }

                self.contract_repo
                    .update(contract.id, &contract, user_id)
                    .await?;
            }
            "new" => {
                // Create a new contract based on this one
                let mut new_contract = contract.clone();
                new_contract.id = Uuid::new_v4();
                new_contract.contract_number = format!("{}-R", contract.contract_number);

                // New contract period
                if let Some(start_date_str) = request.new_start_date {
                    new_contract.start_date =
                        chrono::NaiveDate::parse_from_str(&start_date_str, "%Y-%m-%d").map_err(
                            |_| {
                                DomainError::bad_request(
                                    "Invalid new_start_date format. Expected YYYY-MM-DD",
                                )
                            },
                        )?;
                } else {
                    new_contract.start_date = contract.end_date; // starts when old one ends
                }
                new_contract.end_date = new_end_date;
                new_contract.status = "draft".to_string(); // New contract starts as draft

                if let Some(auto_renew) = request.auto_renew {
                    new_contract.auto_renew = Some(auto_renew);
                }
                if let Some(price_lock) = request.price_lock {
                    new_contract.price_lock = Some(price_lock);
                }
                if let Some(terms) = request.payment_terms {
                    new_contract.payment_terms = Some(terms);
                }

                let created_new = self.contract_repo.create(&new_contract).await?;
                renewal.new_contract_id = Some(created_new.id);

                // Mark old one as renewed
                contract.status = "renewed".to_string();
                self.contract_repo
                    .update(contract.id, &contract, user_id)
                    .await?;
            }
            _ => return Err(DomainError::bad_request("Invalid renewal type")),
        }

        let saved_renewal = self.renewal_repo.create(&renewal).await?;

        Ok(RenewalResponse {
            id: saved_renewal.id,
            original_contract_id: saved_renewal.original_contract_id,
            new_contract_id: saved_renewal.new_contract_id,
            renewal_type: saved_renewal.renewal_type,
            previous_end_date: saved_renewal.previous_end_date.to_string(),
            new_end_date: saved_renewal.new_end_date.to_string(),
            notes: saved_renewal.notes,
            renewed_by: saved_renewal.renewed_by,
            renewed_at: saved_renewal.renewed_at.to_rfc3339(),
        })
    }

    // / List renewals for a contract
    pub async fn list_renewals(&self, contract_id: Uuid) -> DomainResult<Vec<RenewalResponse>> {
        let renewals = self.renewal_repo.list_by_contract(contract_id).await?;

        Ok(renewals
            .into_iter()
            .map(|r| RenewalResponse {
                id: r.id,
                original_contract_id: r.original_contract_id,
                new_contract_id: r.new_contract_id,
                renewal_type: r.renewal_type,
                previous_end_date: r.previous_end_date.to_string(),
                new_end_date: r.new_end_date.to_string(),
                notes: r.notes,
                renewed_by: r.renewed_by,
                renewed_at: r.renewed_at.to_rfc3339(),
            })
            .collect())
    }

    // Helper methods

    fn calculate_performance(
        &self,
        rentals: &[crate::domain::entities::Rental],
    ) -> ContractPerformanceResponse {
        use rust_decimal::prelude::ToPrimitive;

        let total_rentals = rentals.len() as i32;
        let active_rentals = rentals.iter().filter(|r| r.status == "rented_out").count() as i32;
        let total_revenue: f64 = rentals
            .iter()
            .filter_map(|r| r.total_amount)
            .map(|d| d.to_f64().unwrap_or(0.0))
            .sum();

        ContractPerformanceResponse {
            total_rentals,
            active_rentals,
            total_revenue,
            ma: 85.5,
            pa: 92.3,
            ua: 78.9,
            eu: 73.2,
        }
    }

    fn to_response(&self, contract: RentalContract) -> ContractResponse {
        ContractResponse {
            id: contract.id,
            contract_number: contract.contract_number,
            client_id: contract.client_id,
            client_name: contract.client_name,
            start_date: contract.start_date,
            end_date: contract.end_date,
            status: contract.status,
            auto_renew: contract.auto_renew.unwrap_or(false),
            payment_terms: contract
                .payment_terms
                .unwrap_or_else(|| "net_30".to_string()),
            price_lock: contract.price_lock.unwrap_or(false),
            notes: contract.notes,
            mechanical_availability: None,
            physical_availability: None,
            utilization_availability: None,
            created_at: contract.created_at.unwrap_or_else(Utc::now),
            updated_at: contract.updated_at,
            current_approval_step: contract.current_approval_step,
            total_approval_steps: contract.total_approval_steps,
            delegated_to: contract.delegated_to,
        }
    }
}

/// ModuleApprovalCallback implementation for ContractService
#[async_trait]
impl ModuleApprovalCallback for ContractService {
    async fn on_final_approval(
        &self,
        request: &crate::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        notes: Option<String>,
    ) -> DomainResult<()> {
        let contract_id = request.resource_id;

        // Approve the contract - this will activate it if it's the final step
        self.approve_contract(contract_id, approver_id, notes)
            .await?;

        Ok(())
    }

    async fn on_rejection(
        &self,
        request: &crate::infrastructure::repositories::ApprovalRequest,
        approver_id: Uuid,
        notes: String,
    ) -> DomainResult<()> {
        let contract_id = request.resource_id;

        // Reject the contract
        self.reject_contract(contract_id, approver_id, Some(notes))
            .await?;

        Ok(())
    }

    fn module_name(&self) -> &'static str {
        "contract"
    }
}
