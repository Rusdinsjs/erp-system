use chrono::{NaiveDate, Utc};
use crate::JournalService;
use management_system_core::domain::entities::journal::{
    CreateJournalEntryRequest, CreateJournalLineRequest,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::repositories::{AssetRepository, CategoryRepository};
use rust_decimal::Decimal;

#[derive(Clone)]
pub struct DepreciationService {
    asset_repo: AssetRepository,
    category_repo: CategoryRepository,
    journal_service: JournalService,
}

impl DepreciationService {
    pub fn new(
        asset_repo: AssetRepository,
        category_repo: CategoryRepository,
        journal_service: JournalService,
    ) -> Self {
        Self {
            asset_repo,
            category_repo,
            journal_service,
        }
    }

    /// Process monthly depreciation for all eligible assets
    /// Intended to be run by Scheduler on the 1st of the month, for the PREVIOUS month.
    /// Or run end of month. Let's assume run on 1st for previous month.
    pub async fn process_monthly_depreciation(&self) -> DomainResult<usize> {
        // 1. Determine period (Previous Month)
        let now = Utc::now().date_naive();
        // Logic: if today is Jan 1st 2026, we depreciate for Dec 2025.
        // But for simplicity, let's say we assume this is run for "Current Month" if run manually,
        // or we just calculate based on "Assets Active" and not fully depreciated.

        // Let's implement robust check: Find assets that are "in_use" / "deployed" and have value > residual.

        let batch_size = 100;
        let mut offset = 0;
        let mut processed_count = 0;

        loop {
            // Fetch active assets (paginated)
            // Ideally we need a repository method to stream or fetch all active assets with depreciation info
            // For now, let's reuse list or search, but we need internal-only method ideally.
            // Using search for "in_use" assets
            let assets = self
                .asset_repo
                .search(
                    "",                      // query
                    None,                    // category
                    None,                    // location
                    None,                    // dept
                    Some("in_use,deployed"), // status
                    None,                    // is_fuel
                    batch_size,
                    offset,
                    false, // exact
                    None,  // sort
                    None,
                )
                .await
                .map_err(|e| DomainError::Database(e.to_string()))?;

            if assets.is_empty() {
                break;
            }

            for summary in assets {
                // Fetch full details to get price, dates, etc.
                // Optimally we should have a custom query for this, but N+1 for batch job is acceptable for now given volume.
                if let Some(asset) = self
                    .asset_repo
                    .find_by_id(summary.id)
                    .await
                    .map_err(|e| DomainError::Database(e.to_string()))?
                {
                    if let Err(e) = self.depreciate_asset(&asset, now).await {
                        tracing::error!("Failed to depreciate asset {}: {}", asset.asset_code, e);
                    } else {
                        processed_count += 1;
                    }
                }
            }

            offset += batch_size;
        }

        Ok(processed_count)
    }

    async fn depreciate_asset(
        &self,
        asset: &management_system_core::domain::entities::Asset,
        date: NaiveDate,
    ) -> DomainResult<()> {
        // 1. Validate Eligibility
        let purchase_price = match asset.purchase_price {
            Some(p) if p > Decimal::ZERO => p,
            _ => return Ok(()), // No price, skip
        };

        let meaningful_life = match asset.useful_life_months {
            Some(m) if m > 0 => m,
            _ => return Ok(()), // No useful life, skip
        };

        if asset.purchase_date.is_none() {
            return Ok(());
        }

        // Check if fully depreciated
        // Current Book Value calculation
        let residual_value = asset.residual_value.unwrap_or(Decimal::ZERO);

        let current_value = asset.calculate_book_value().unwrap_or(Decimal::ZERO);

        if current_value <= residual_value {
            return Ok(()); // Fully depreciated
        }

        // 2. Calculate Monthly Amount (Straight Line)
        // (Cost - Residual) / Useful Life Months
        let depreciable_amount = purchase_price - residual_value;
        let monthly_amount = depreciable_amount / Decimal::from(meaningful_life);

        // Cap at current value - residual (don't go below residual)
        let actual_amount = if current_value - monthly_amount < residual_value {
            current_value - residual_value
        } else {
            monthly_amount
        };

        if actual_amount <= Decimal::ZERO {
            return Ok(());
        }

        // 3. Get GL Accounts from Category
        let category = self
            .category_repo
            .find_by_id(asset.category_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::NotFound {
                entity: "Category".to_string(),
                id: asset.category_id.to_string(),
            })?;

        let expense_acc = category.expense_account_id;
        let accumulated_acc = category.accumulated_depreciation_account_id;

        if let (Some(debit_id), Some(credit_id)) = (expense_acc, accumulated_acc) {
            // 4. Create Journal Entry
            let journal_req = CreateJournalEntryRequest {
                date,
                description: format!(
                    "Depreciation: {} ({}) - {}",
                    asset.name,
                    asset.asset_code,
                    date.format("%b %Y")
                ),
                reference: Some(asset.asset_code.clone()),
                lines: vec![
                    CreateJournalLineRequest {
                        account_id: debit_id,
                        description: Some(format!("Depreciation Exp: {}", asset.name)),
                        debit: actual_amount,
                        credit: Decimal::ZERO,
                    },
                    CreateJournalLineRequest {
                        account_id: credit_id,
                        description: Some(format!("Accumulated Depr: {}", asset.name)),
                        debit: Decimal::ZERO,
                        credit: actual_amount,
                    },
                ],
            };

            let entry = self.journal_service.create_entry(journal_req, None).await?;

            // 5. Log it (TODO: Create logs table repository/method, for now just log to stdout/tracing)
            tracing::info!(
                "Depreciated Asset {} for amount {}. Journal: {}",
                asset.asset_code,
                actual_amount,
                entry.header.id
            );

            // TODO: Insert into asset_depreciation_logs
            // self.repo.log_depreciation(...)
        } else {
            tracing::warn!(
                "Skipping depreciation for Asset {}: Category {} missing GL accounts",
                asset.asset_code,
                category.name
            );
        }

        Ok(())
    }
}
