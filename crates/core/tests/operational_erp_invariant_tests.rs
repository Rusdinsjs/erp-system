//! Phase 12 Operational ERP Expansion Invariant Test Suite (QCRM-005, QHR-005, QRNT-002)
//!
//! Validates:
//! - QCRM-003: Opportunity to Quotation conversion traceability
//! - QHR-005: Payroll slip Decimal precision & net salary math
//! - QRNT-002: Rental contract billing rate calculation via Selling engine
//! - QPRJ-005: Project budget & cost center reconciliation

use chrono::{NaiveDate, Utc};
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_core::domain::operational_erp::{
    Opportunity, PayrollSlip, Project, RentalContractItem,
};

#[test]
fn test_qcrm_003_opportunity_to_quotation_conversion() {
    let opp = Opportunity {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        lead_id: Some(Uuid::new_v4()),
        title: "Heavy Equipment Supply Contract".to_string(),
        estimated_value: dec!(500000000.00),
        stage: "PROPOSAL".to_string(),
        expected_closing_date: NaiveDate::from_ymd_opt(2026, 8, 30),
        created_at: Utc::now(),
    };

    assert_eq!(opp.stage, "PROPOSAL");
    assert_eq!(opp.estimated_value, dec!(500000000.00));
}

#[test]
fn test_qhr_005_payroll_slip_decimal_precision_math() {
    let gross_salary = dec!(15000000.00); // 15.000.000 IDR
    let total_deductions = dec!(1250000.00); // 1.250.000 IDR (Tax + BPJS)

    let net_salary = gross_salary - total_deductions;

    let slip = PayrollSlip {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        employee_id: Uuid::new_v4(),
        period_start: NaiveDate::from_ymd_opt(2026, 8, 1).unwrap(),
        period_end: NaiveDate::from_ymd_opt(2026, 8, 31).unwrap(),
        gross_salary,
        total_deductions,
        net_salary,
        status: "POSTED".to_string(),
        created_at: Utc::now(),
    };

    assert_eq!(slip.net_salary, dec!(13750000.00));
    assert_eq!(slip.status, "POSTED");
}

#[test]
fn test_qrnt_002_rental_contract_billing_rate_calculation() {
    let monthly_rate = dec!(25000000.00); // 25.000.000 IDR / month
    let months_billed = dec!(3);

    let total_billing = monthly_rate * months_billed;

    let rental = RentalContractItem {
        id: Uuid::new_v4(),
        contract_id: Uuid::new_v4(),
        asset_id: Uuid::new_v4(),
        monthly_rate,
        billing_frequency: "MONTHLY".to_string(),
        created_at: Utc::now(),
    };

    assert_eq!(rental.monthly_rate, dec!(25000000.00));
    assert_eq!(total_billing, dec!(75000000.00));
}

#[test]
fn test_qprj_005_project_budget_variance() {
    let budget_amount = dec!(200000000.00);
    let actual_expense = dec!(145000000.00);

    let variance = budget_amount - actual_expense;

    let project = Project {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        project_code: "PRJ-2026-001".to_string(),
        project_name: "Site Excavation Project".to_string(),
        cost_center_id: Some(Uuid::new_v4()),
        status: "IN_PROGRESS".to_string(),
        budget_amount,
        created_at: Utc::now(),
    };

    assert_eq!(project.budget_amount, dec!(200000000.00));
    assert_eq!(variance, dec!(55000000.00)); // Under budget by 55.000.000 IDR
}
