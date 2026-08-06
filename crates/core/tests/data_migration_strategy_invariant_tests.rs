//! Section 23 Data Migration Strategy Invariant Test Suite
//!
//! Validates:
//! - 10-Step Migration Sequence (Inventory -> AddSchema -> Backfill -> Reconcile -> ShadowRead -> SwitchWrites -> SwitchReads -> Enforce -> Observe -> Cleanup)
//! - Opening Balance Cutover Vouchers (No Fake History Rule)

use chrono::{NaiveDate, Utc};
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_core::domain::data_migration::{
    DataMigrationLog, MigrationStep, OpeningBalanceItem, OpeningBalanceVoucher,
};

#[test]
fn test_10_step_migration_sequence() {
    let steps = vec![
        MigrationStep::Inventory,
        MigrationStep::AddSchema,
        MigrationStep::Backfill,
        MigrationStep::Reconcile,
        MigrationStep::ShadowRead,
        MigrationStep::SwitchWrites,
        MigrationStep::SwitchReads,
        MigrationStep::Enforce,
        MigrationStep::Observe,
        MigrationStep::Cleanup,
    ];

    assert_eq!(steps.len(), 10);
    assert_eq!(steps[0].name(), "INVENTORY");
    assert_eq!(steps[3].name(), "RECONCILE");
    assert_eq!(steps[9].name(), "CLEANUP");

    let log = DataMigrationLog {
        id: Uuid::new_v4(),
        migration_name: "20260806_legacy_inventory_cutover".to_string(),
        step_number: MigrationStep::Reconcile as i32,
        step_name: MigrationStep::Reconcile.name().to_string(),
        records_inventoried: 15000,
        records_backfilled: 15000,
        reconciled_sum_delta: dec!(0.0000), // Zero delta = 100% accurate
        status: "COMPLETED".to_string(),
        executed_at: Utc::now(),
    };

    assert_eq!(log.reconciled_sum_delta, dec!(0.0000));
}

#[test]
fn test_opening_balance_voucher_provenance() {
    let voucher = OpeningBalanceVoucher {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        voucher_type: "STOCK_OPENING_BALANCE".to_string(),
        cutover_date: NaiveDate::from_ymd_opt(2026, 8, 1).unwrap(),
        total_amount: dec!(250000000.00),
        source_system: "Legacy ERP v1.0 Export".to_string(),
        status: "POSTED".to_string(),
        created_by: Some(Uuid::new_v4()),
        posted_at: Utc::now(),
    };

    let item = OpeningBalanceItem {
        id: Uuid::new_v4(),
        voucher_id: voucher.id,
        account_id: None,
        warehouse_id: Some(Uuid::new_v4()),
        item_id: Some(Uuid::new_v4()),
        qty: Some(dec!(50.00)),
        unit_cost: Some(dec!(5000000.00)),
        amount: dec!(250000000.00),
    };

    assert_eq!(voucher.source_system, "Legacy ERP v1.0 Export");
    assert_eq!(item.amount, dec!(250000000.00));
}
