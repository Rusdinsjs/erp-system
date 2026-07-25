use management_system_core::infrastructure::repositories::AssetExpenseRepository;
use management_system_core::application::dto::asset_expense_dto::{
    AssetExpenseResponse, CreateAssetExpenseRequest,
};
use management_system_core::application::services::approval_service::ApprovalService;
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::repositories::AssetRepository;
use serde_json::json;
use uuid::Uuid;

#[derive(Clone)]
pub struct AssetExpenseService {
    repo: AssetExpenseRepository,
    asset_repo: AssetRepository,
    approval_service: ApprovalService,
}

impl AssetExpenseService {
    pub fn new(
        repo: AssetExpenseRepository,
        asset_repo: AssetRepository,
        approval_service: ApprovalService,
    ) -> Self {
        Self {
            repo,
            asset_repo,
            approval_service,
        }
    }

    pub async fn create(
        &self,
        asset_id: Uuid,
        request: CreateAssetExpenseRequest,
        requested_by: Uuid,
    ) -> DomainResult<AssetExpenseResponse> {
        let expense = self.repo.create(asset_id, request, requested_by).await?;

        // Create Approval Request
        // Snapshot the expense data for the approval record
        let snapshot = json!(expense);

        self.approval_service
            .create_request(
                "AssetExpense",
                expense.id,
                "CREATE",
                requested_by,
                Some(snapshot),
            )
            .await?;

        Ok(expense)
    }

    pub async fn find_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<AssetExpenseResponse>> {
        self.repo.find_by_asset_id(asset_id).await
    }

    pub async fn approve_expense(
        &self,
        expense_id: Uuid,
        approver_id: Uuid,
        role_code: String,
        notes: Option<String>,
    ) -> DomainResult<AssetExpenseResponse> {
        // 1. Find active approval request
        let approval_req = self
            .approval_service
            .find_active_request("AssetExpense", expense_id)
            .await?
            .ok_or_else(|| {
                DomainError::not_found(
                    "Active Approval Request for Expense",
                    expense_id.to_string(),
                )
            })?;

        // 2. Approve via ApprovalService
        let updated_approval = self
            .approval_service
            .approve_request(approval_req.id, approver_id, role_code, notes)
            .await?;

        // 3. Check if fully approved (assuming L2 is final for now)
        if updated_approval.status == "APPROVED_L2" {
            let expense =
                self.repo.find_by_id(expense_id).await?.ok_or_else(|| {
                    DomainError::not_found("AssetExpense", expense_id.to_string())
                })?;

            self.repo.update_status(expense_id, "APPROVED").await?;

            // CAPEX Logic: Update Asset Value
            if expense.expense_type == "CAPEX" {
                if let Some(mut asset) = self
                    .asset_repo
                    .find_by_id(expense.asset_id)
                    .await
                    .map_err(|e| DomainError::Database(e.to_string()))?
                {
                    let current_price = asset.purchase_price.unwrap_or(rust_decimal::Decimal::ZERO);
                    asset.purchase_price = Some(current_price + expense.amount);
                    self.asset_repo
                        .update(&asset)
                        .await
                        .map_err(|e| DomainError::Database(e.to_string()))?;
                }
            }
        }

        // Return updated expense
        self.repo
            .find_by_id(expense_id)
            .await?
            .ok_or_else(|| DomainError::not_found("AssetExpense", expense_id.to_string()))
    }

    pub async fn reject_expense(
        &self,
        expense_id: Uuid,
        approver_id: Uuid,
        notes: String,
    ) -> DomainResult<AssetExpenseResponse> {
        // 1. Find active approval request
        let approval_req = self
            .approval_service
            .find_active_request("AssetExpense", expense_id)
            .await?
            .ok_or_else(|| {
                DomainError::not_found(
                    "Active Approval Request for Expense",
                    expense_id.to_string(),
                )
            })?;

        // 2. Reject via ApprovalService
        self.approval_service
            .reject_request(approval_req.id, approver_id, notes)
            .await?;

        // 3. Update Expense Status
        self.repo.update_status(expense_id, "REJECTED").await?;

        // Return updated expense
        self.repo
            .find_by_id(expense_id)
            .await?
            .ok_or_else(|| DomainError::not_found("AssetExpense", expense_id.to_string()))
    }
}
