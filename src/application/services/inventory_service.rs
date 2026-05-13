use crate::application::dto::{
    CreateInventoryCategoryRequest, CreateInventoryDocumentRequest, CreateInventoryItemRequest,
    InventoryAdjustmentRequest,
};
use crate::application::services::{JournalService, NotificationService};
use crate::domain::entities::inventory::{
    InventoryCategory, InventoryDocument, InventoryItem, InventoryMovement, InventoryMovementType,
};
use crate::domain::entities::journal::{CreateJournalEntryRequest, CreateJournalLineRequest};
use crate::domain::errors::DomainError;
use crate::infrastructure::repositories::InventoryRepository;
use chrono::Utc;
use rust_decimal::Decimal;
use std::sync::Arc;
use uuid::Uuid;

pub type DomainResult<T> = Result<T, DomainError>;

#[derive(Clone)]
pub struct InventoryService {
    repository: Arc<InventoryRepository>,
    journal_service: JournalService,
    notification_service: NotificationService,
}

impl InventoryService {
    pub fn new(
        repository: Arc<InventoryRepository>,
        journal_service: JournalService,
        notification_service: NotificationService,
    ) -> Self {
        Self {
            repository,
            journal_service,
            notification_service,
        }
    }

    pub async fn create_category(
        &self,
        req: CreateInventoryCategoryRequest,
    ) -> DomainResult<InventoryCategory> {
        let category = InventoryCategory {
            id: Uuid::new_v4(),
            code: req.code,
            name: req.name,
            description: req.description,
            inventory_account_id: req.inventory_account_id,
            expense_account_id: req.expense_account_id,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repository
            .create_category(&category)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn list_categories(&self) -> DomainResult<Vec<InventoryCategory>> {
        self.repository
            .list_categories()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn create_item(
        &self,
        req: CreateInventoryItemRequest,
    ) -> DomainResult<InventoryItem> {
        let item = InventoryItem {
            id: Uuid::new_v4(),
            category_id: req.category_id,
            unit_id: req.unit_id,
            sku: req.sku,
            name: req.name,
            description: req.description,
            min_stock: req.min_stock.unwrap_or_default(),
            max_stock: req.max_stock.unwrap_or_default(),
            current_quantity: req.initial_quantity.unwrap_or_default(),
            average_cost: req.purchase_price.unwrap_or_default(),
            last_purchase_price: req.purchase_price.unwrap_or_default(),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let created = self
            .repository
            .create_item(&item)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // If there's initial quantity, create a movement
        if let Some(qty) = req.initial_quantity {
            if qty > Decimal::ZERO {
                let movement = InventoryMovement {
                    id: Uuid::new_v4(),
                    item_id: created.id,
                    movement_type: InventoryMovementType::InAdjustment,
                    quantity: qty,
                    unit_price: req.purchase_price.unwrap_or_default(),
                    total_value: qty * req.purchase_price.unwrap_or_default(),
                    reference_id: None,
                    reference_number: Some("INITIAL_STOCK".to_string()),
                    notes: Some("Initial stock setup".to_string()),
                    created_by: None,
                    created_at: Utc::now(),
                };
                let _ = self.repository.create_movement(&movement).await;
            }
        }

        Ok(created)
    }

    pub async fn create_item_bulk(
        &self,
        items: Vec<CreateInventoryItemRequest>,
    ) -> DomainResult<usize> {
        let mut count = 0;
        for req in items {
            if let Ok(_) = self.create_item(req).await {
                count += 1;
            }
        }
        Ok(count)
    }

    pub async fn adjust_stock(
        &self,
        id: Uuid,
        req: InventoryAdjustmentRequest,
        user_id: Option<Uuid>,
    ) -> DomainResult<bool> {
        let item = self
            .repository
            .get_item(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::NotFound {
                entity: "InventoryItem".to_string(),
                id: id.to_string(),
            })?;

        let new_qty = item.current_quantity + req.quantity;
        if new_qty < Decimal::ZERO {
            return Err(DomainError::BusinessRuleViolation {
                rule: "INSUFFICIENT_STOCK".to_string(),
                message: format!(
                    "Insufficient stock for {}. Current: {}, Required: {}",
                    item.name,
                    item.current_quantity,
                    req.quantity.abs()
                ),
            });
        }

        let mut new_avg_cost = item.average_cost;
        let movement_type = if req.quantity > Decimal::ZERO {
            // Recalculate average cost for additions
            if let Some(price) = req.unit_price {
                let total_current_val = item.current_quantity * item.average_cost;
                let total_new_val = req.quantity * price;
                if new_qty > Decimal::ZERO {
                    new_avg_cost = (total_current_val + total_new_val) / new_qty;
                }
            }
            InventoryMovementType::InAdjustment
        } else {
            InventoryMovementType::OutAdjustment
        };

        let movement = InventoryMovement {
            id: Uuid::new_v4(),
            item_id: id,
            movement_type,
            quantity: req.quantity.abs(),
            unit_price: req.unit_price.unwrap_or(item.average_cost),
            total_value: req.quantity.abs() * req.unit_price.unwrap_or(item.average_cost),
            reference_id: None,
            reference_number: Some("MANUAL_ADJUSTMENT".to_string()),
            notes: req.notes,
            created_by: user_id,
            created_at: Utc::now(),
        };

        self.repository
            .create_movement(&movement)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        self.repository
            .update_stock(id, new_qty, new_avg_cost)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn adjust_stock_batch(
        &self,
        req: crate::application::dto::BatchInventoryAdjustmentRequest,
        user_id: Option<Uuid>,
    ) -> DomainResult<bool> {
        // Ideally this should be a transaction, but for now we iterate
        for item in req.items {
            let adjust_req = crate::application::dto::InventoryAdjustmentRequest {
                quantity: item.quantity,
                unit_price: item.unit_price,
                notes: req.notes.clone(), // Share the main note or maybe we should use item specific?
            };
            // Ignore individual failures? Or fail all?
            // For Stock Opname, we usually want to process as much as possible,
            // but for data integrity, maybe fail if any fails.
            // Let's stop on first error for now.
            self.adjust_stock(item.item_id, adjust_req, user_id).await?;
        }
        Ok(true)
    }

    pub async fn list_items(&self, category_id: Option<Uuid>) -> DomainResult<Vec<InventoryItem>> {
        self.repository
            .list_items(category_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn get_item(&self, id: Uuid) -> DomainResult<Option<InventoryItem>> {
        self.repository
            .get_item(id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn create_document(
        &self,
        item_id: Uuid,
        req: CreateInventoryDocumentRequest,
        user_id: Option<Uuid>,
    ) -> DomainResult<InventoryDocument> {
        let document = InventoryDocument {
            id: Uuid::new_v4(),
            item_id,
            name: req.name,
            type_: req.type_,
            file_path: req.file_path,
            mime_type: req.mime_type,
            size_bytes: req.size_bytes,
            expiry_date: req.expiry_date,
            notes: req.notes,
            uploaded_by: user_id,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repository
            .create_document(&document)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    pub async fn list_documents(&self, item_id: Uuid) -> DomainResult<Vec<InventoryDocument>> {
        self.repository
            .find_documents_by_item_id(item_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))
    }

    /// Process inventory usage from Work Orders
    /// Automatically creates journal entries if accounts are mapped
    pub async fn process_usage(
        &self,
        item_id: Uuid,
        quantity: Decimal,
        work_order_id: Uuid,
        work_order_number: String,
        created_by: Uuid,
        expense_type: Option<String>,
        target_account_id: Option<Uuid>,
    ) -> DomainResult<()> {
        let item = self
            .repository
            .get_item(item_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or(DomainError::NotFound {
                entity: "InventoryItem".to_string(),
                id: item_id.to_string(),
            })?;

        // 1. Validate Stock
        if item.current_quantity < quantity {
            return Err(DomainError::BusinessRuleViolation {
                rule: "INSUFFICIENT_STOCK".to_string(),
                message: format!(
                    "Insufficient stock for {}. Current: {}, Required: {}",
                    item.name, item.current_quantity, quantity
                ),
            });
        }

        let total_cost = quantity * item.average_cost;

        // 2. Create Movement
        let movement = InventoryMovement {
            id: Uuid::new_v4(),
            item_id,
            movement_type: InventoryMovementType::OutUsage,
            quantity,
            unit_price: item.average_cost,
            total_value: total_cost,
            reference_id: Some(work_order_id),
            reference_number: Some(work_order_number.clone()),
            notes: Some(format!(
                "Used in Work Order {} ({})",
                work_order_number,
                expense_type.clone().unwrap_or("OPEX".to_string())
            )),
            created_by: Some(created_by),
            created_at: Utc::now(),
        };

        self.repository
            .create_movement(&movement)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // 3. Update Stock
        let new_qty = item.current_quantity - quantity;
        self.repository
            .update_stock(item_id, new_qty, item.average_cost)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // 4. Create Journal Entry (if accounts are mapped)
        if let Some(category) = self
            .repository
            .get_category(item.category_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
        {
            // Determine Debit Account based on Expense Type
            let debit_account_id = if let Some(etype) = &expense_type {
                if etype == "CAPEX" {
                    // Use the provided target asset account (Control Account)
                    // If not provided, fallback to category expense account (with potential warning in logs)
                    target_account_id.or(category.expense_account_id)
                } else {
                    category.expense_account_id
                }
            } else {
                category.expense_account_id
            };

            if let (Some(debit_acc), Some(credit_acc)) =
                (debit_account_id, category.inventory_account_id)
            {
                if total_cost > Decimal::ZERO {
                    let journal_req = CreateJournalEntryRequest {
                        date: Utc::now().date_naive(),
                        description: format!(
                            "Inventory Usage: {} for WO {} ({})",
                            item.name,
                            work_order_number,
                            expense_type.clone().unwrap_or("OPEX".to_string())
                        ),
                        reference: Some(work_order_number.clone()),
                        lines: vec![
                            // Debit Expense / Asset
                            CreateJournalLineRequest {
                                account_id: debit_acc,
                                description: Some(format!(
                                    "{} Cost: {}",
                                    expense_type.clone().unwrap_or("Expense".to_string()),
                                    item.name
                                )),
                                debit: total_cost,
                                credit: Decimal::ZERO,
                            },
                            // Credit Asset (Inventory)
                            CreateJournalLineRequest {
                                account_id: credit_acc,
                                description: Some(format!("Stock Deduction: {}", item.name)),
                                debit: Decimal::ZERO,
                                credit: total_cost,
                            },
                        ],
                    };

                    // We ignore errors here to not block the transaction, but log them
                    // Ideally this should be in a transaction
                    if let Err(e) = self
                        .journal_service
                        .create_entry(journal_req, Some(created_by))
                        .await
                    {
                        println!("ERROR creating journal entry for inventory usage: {:?}", e);
                    }
                }
            }
        }

        // 5. Check Low Stock & Notify
        if new_qty <= item.min_stock {
            let _ = self
                .notification_service
                .notify_low_stock(&item.name, new_qty, item.min_stock)
                .await;
        }

        Ok(())
    }
}
