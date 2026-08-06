use crate::domain::stock_entry::{
    StockLedgerEntry, StockPostingInstruction, StockPostingLineItem,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_finance::{
    AccountingPostingEngine, PostingInstruction as GLPostingInstruction,
    PostingLineItem as GLPostingLineItem,
};
use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, Transaction};
use std::collections::BTreeSet;
use uuid::Uuid;

/// Centralized Stock Posting Engine (QSTK-005)
///
/// Handles all inventory movements (Receipt, Issue, Transfer, Adjustment) with:
/// 1. Deterministic locking on bins (SELECT ... FOR UPDATE sorted by warehouse_id, item_id)
///    to prevent lost updates and deadlocks under concurrent requests.
/// 2. Moving Average valuation math using Decimal only (QSTK-007).
/// 3. Negative stock policy check at posting time under lock (QSTK-006).
/// 4. Atomic transfers between warehouses in one UnitOfWork (QSTK-009).
/// 5. Perpetual Inventory GL Bridge calling AccountingPostingEngine (QSTK-012).
#[derive(Clone)]
pub struct StockPostingEngine {
    pool: PgPool,
    accounting_engine: Option<AccountingPostingEngine>,
}

impl StockPostingEngine {
    pub fn new(pool: PgPool, accounting_engine: Option<AccountingPostingEngine>) -> Self {
        Self {
            pool,
            accounting_engine,
        }
    }

    /// Process a stock posting instruction atomically inside a UnitOfWork/Transaction (QSTK-005)
    pub async fn post_in_uow(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        instruction: &StockPostingInstruction,
    ) -> DomainResult<Vec<StockLedgerEntry>> {
        if instruction.lines.is_empty() {
            return Err(DomainError::business_rule(
                "EmptyStockPostingInstruction",
                "Stock posting instruction must contain at least one line",
            ));
        }

        // QSTK-005 Deadlock Prevention & Deterministic Locking:
        // Collect distinct (warehouse_id, item_id) pairs and sort them deterministically
        let mut target_pairs = BTreeSet::new();
        for line in &instruction.lines {
            target_pairs.insert((line.warehouse_id, line.item_id));
        }

        // Acquire FOR UPDATE locks on all affected Bins in deterministic order
        for (wh_id, item_id) in &target_pairs {
            // Ensure Bin exists or insert default 0 bin
            sqlx::query(
                r#"
                INSERT INTO bins (company_id, warehouse_id, item_id, actual_qty, reserved_qty, ordered_qty, stock_value)
                VALUES ($1, $2, $3, 0.0000, 0.0000, 0.0000, 0.0000)
                ON CONFLICT (company_id, warehouse_id, item_id) DO NOTHING
                "#,
            )
            .bind(instruction.company_id)
            .bind(wh_id)
            .bind(item_id)
            .execute(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            // Lock row FOR UPDATE
            let _: (Decimal, Decimal) = sqlx::query_as(
                "SELECT actual_qty, stock_value FROM bins WHERE company_id = $1 AND warehouse_id = $2 AND item_id = $3 FOR UPDATE",
            )
            .bind(instruction.company_id)
            .bind(wh_id)
            .bind(item_id)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let mut sle_entries = Vec::new();
        let mut gl_posting_lines = Vec::new();

        for line in &instruction.lines {
            // Fetch current bin state under lock
            let bin_row: (Decimal, Decimal) = sqlx::query_as(
                "SELECT actual_qty, stock_value FROM bins WHERE company_id = $1 AND warehouse_id = $2 AND item_id = $3",
            )
            .bind(instruction.company_id)
            .bind(line.warehouse_id)
            .bind(line.item_id)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            let current_qty = bin_row.0;
            let current_value = bin_row.1;

            let new_qty = current_qty + line.actual_qty_delta;

            // QSTK-006 Negative Stock Policy Check
            let allow_negative = line.allow_negative_stock.unwrap_or(false);
            if !allow_negative && new_qty < Decimal::ZERO {
                return Err(DomainError::business_rule(
                    "NegativeStockNotAllowed",
                    &format!(
                        "Stock posting for item {} at warehouse {} would result in negative quantity ({})",
                        line.item_id, line.warehouse_id, new_qty
                    ),
                ));
            }

            // QSTK-007 Valuation Math (Moving Average)
            let (unit_rate, value_delta, new_value) = if line.actual_qty_delta > Decimal::ZERO {
                let in_cost = line.unit_cost.unwrap_or_else(|| {
                    if current_qty > Decimal::ZERO {
                        current_value / current_qty
                    } else {
                        Decimal::ZERO
                    }
                });
                let delta_val = line.actual_qty_delta * in_cost;
                let final_val = current_value + delta_val;
                let final_rate = if new_qty > Decimal::ZERO {
                    final_val / new_qty
                } else {
                    Decimal::ZERO
                };
                (final_rate, delta_val, final_val)
            } else if line.actual_qty_delta < Decimal::ZERO {
                let current_rate = if current_qty > Decimal::ZERO {
                    current_value / current_qty
                } else {
                    line.unit_cost.unwrap_or(Decimal::ZERO)
                };
                let delta_val = line.actual_qty_delta * current_rate;
                let final_val = current_value + delta_val;
                let final_rate = current_rate;
                (final_rate, delta_val, final_val)
            } else {
                let current_rate = if current_qty > Decimal::ZERO {
                    current_value / current_qty
                } else {
                    Decimal::ZERO
                };
                (current_rate, Decimal::ZERO, current_value)
            };

            // Insert Immutable Stock Ledger Entry
            let sle_row: (
                Uuid,
                chrono::DateTime<chrono::Utc>,
                chrono::DateTime<chrono::Utc>,
            ) = sqlx::query_as(
                r#"
                INSERT INTO stock_ledger_entries (
                    company_id, warehouse_id, item_id, posting_date,
                    actual_qty_delta, qty_after, valuation_rate, stock_value_delta, stock_value_after,
                    voucher_type, voucher_no, voucher_id, voucher_line_id, batch_no, serial_no, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id, posting_datetime, created_at
                "#,
            )
            .bind(instruction.company_id)
            .bind(line.warehouse_id)
            .bind(line.item_id)
            .bind(instruction.posting_date)
            .bind(line.actual_qty_delta)
            .bind(new_qty)
            .bind(unit_rate)
            .bind(value_delta)
            .bind(new_value)
            .bind(&instruction.voucher_type)
            .bind(&instruction.voucher_no)
            .bind(instruction.voucher_id)
            .bind(line.voucher_line_id)
            .bind(&line.batch_no)
            .bind(&line.serial_no)
            .bind(instruction.created_by)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            // Update Bin Projection
            sqlx::query(
                r#"
                UPDATE bins
                SET actual_qty = $1, stock_value = $2, updated_at = NOW()
                WHERE company_id = $3 AND warehouse_id = $4 AND item_id = $5
                "#,
            )
            .bind(new_qty)
            .bind(new_value)
            .bind(instruction.company_id)
            .bind(line.warehouse_id)
            .bind(line.item_id)
            .execute(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            // QSTK-012 Perpetual Inventory GL Bridge
            let acc_map: Option<(Option<Uuid>, Option<Uuid>)> = sqlx::query_as(
                r#"
                SELECT c.inventory_account_id, c.expense_account_id
                FROM inventory_items i
                JOIN inventory_categories c ON i.category_id = c.id
                WHERE i.id = $1
                "#,
            )
            .bind(line.item_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            if let Some((Some(inv_acc), Some(exp_acc))) = acc_map {
                let abs_val = value_delta.abs();
                if abs_val > Decimal::ZERO {
                    if line.actual_qty_delta > Decimal::ZERO {
                        gl_posting_lines.push(GLPostingLineItem {
                            account_id: inv_acc,
                            debit: abs_val,
                            credit: Decimal::ZERO,
                            party_type: None,
                            party_id: None,
                            cost_center_id: None,
                            project_id: None,
                            currency: Some("IDR".to_string()),
                            exchange_rate: Some(Decimal::from(1)),
                        });
                        gl_posting_lines.push(GLPostingLineItem {
                            account_id: exp_acc,
                            debit: Decimal::ZERO,
                            credit: abs_val,
                            party_type: None,
                            party_id: None,
                            cost_center_id: None,
                            project_id: None,
                            currency: Some("IDR".to_string()),
                            exchange_rate: Some(Decimal::from(1)),
                        });
                    } else if line.actual_qty_delta < Decimal::ZERO {
                        gl_posting_lines.push(GLPostingLineItem {
                            account_id: exp_acc,
                            debit: abs_val,
                            credit: Decimal::ZERO,
                            party_type: None,
                            party_id: None,
                            cost_center_id: None,
                            project_id: None,
                            currency: Some("IDR".to_string()),
                            exchange_rate: Some(Decimal::from(1)),
                        });
                        gl_posting_lines.push(GLPostingLineItem {
                            account_id: inv_acc,
                            debit: Decimal::ZERO,
                            credit: abs_val,
                            party_type: None,
                            party_id: None,
                            cost_center_id: None,
                            project_id: None,
                            currency: Some("IDR".to_string()),
                            exchange_rate: Some(Decimal::from(1)),
                        });
                    }
                }
            }

            sle_entries.push(StockLedgerEntry {
                id: sle_row.0,
                company_id: instruction.company_id,
                warehouse_id: line.warehouse_id,
                item_id: line.item_id,
                posting_date: instruction.posting_date,
                posting_datetime: sle_row.1,
                actual_qty_delta: line.actual_qty_delta,
                qty_after: new_qty,
                valuation_rate: unit_rate,
                stock_value_delta: value_delta,
                stock_value_after: new_value,
                voucher_type: instruction.voucher_type.clone(),
                voucher_no: instruction.voucher_no.clone(),
                voucher_id: instruction.voucher_id,
                voucher_line_id: line.voucher_line_id,
                batch_no: line.batch_no.clone(),
                serial_no: line.serial_no.clone(),
                is_cancelled: false,
                created_at: sle_row.2,
                created_by: instruction.created_by,
            });
        }

        // QSTK-012 Post GL entries if accounting_engine is available and GL lines are generated
        if let Some(ref gl_engine) = self.accounting_engine {
            if !gl_posting_lines.is_empty() {
                let gl_instruction = GLPostingInstruction {
                    company_id: instruction.company_id,
                    posting_date: instruction.posting_date,
                    voucher_type: format!("STK_{}", instruction.voucher_type),
                    voucher_no: instruction.voucher_no.clone(),
                    voucher_id: instruction.voucher_id,
                    lines: gl_posting_lines,
                    created_by: instruction.created_by,
                };

                gl_engine.post_in_uow(tx, &gl_instruction).await?;
            }
        }

        Ok(sle_entries)
    }

    /// QSTK-009 Atomic Transfer between two warehouses inside a UnitOfWork
    pub async fn transfer_in_uow(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        company_id: Uuid,
        source_warehouse_id: Uuid,
        dest_warehouse_id: Uuid,
        item_id: Uuid,
        qty: Decimal,
        unit_cost: Option<Decimal>,
        posting_date: chrono::NaiveDate,
        voucher_type: &str,
        voucher_no: &str,
        voucher_id: Uuid,
        created_by: Option<Uuid>,
    ) -> DomainResult<Vec<StockLedgerEntry>> {
        if qty <= Decimal::ZERO {
            return Err(DomainError::business_rule(
                "InvalidTransferQuantity",
                "Transfer quantity must be greater than 0",
            ));
        }

        let instruction = StockPostingInstruction {
            company_id,
            posting_date,
            voucher_type: voucher_type.to_string(),
            voucher_no: voucher_no.to_string(),
            voucher_id,
            lines: vec![
                StockPostingLineItem {
                    warehouse_id: source_warehouse_id,
                    item_id,
                    actual_qty_delta: -qty,
                    unit_cost,
                    voucher_line_id: None,
                    batch_no: None,
                    serial_no: None,
                    allow_negative_stock: Some(false),
                },
                StockPostingLineItem {
                    warehouse_id: dest_warehouse_id,
                    item_id,
                    actual_qty_delta: qty,
                    unit_cost,
                    voucher_line_id: None,
                    batch_no: None,
                    serial_no: None,
                    allow_negative_stock: Some(false),
                },
            ],
            created_by,
        };

        self.post_in_uow(tx, &instruction).await
    }
}
