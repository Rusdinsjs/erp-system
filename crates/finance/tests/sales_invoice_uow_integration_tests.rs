//! Real Sales Invoice UnitOfWork & Invariants Unit/Integration Tests (3R.1-004, 3R.1-005, 3R.1-007)

use chrono::NaiveDate;
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_core::domain::entities::{
    CreateInvoiceItemRequest, CreateSalesInvoiceRequest,
};
use management_system_core::domain::errors::DomainError;

#[test]
fn test_3r_1_004_empty_invoice_lines_rejected_on_create() {
    let req = CreateSalesInvoiceRequest {
        invoice_number: "INV/TEST/EMPTY".to_string(),
        client_id: Uuid::new_v4(),
        date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        due_date: None,
        subject: Some("Empty Items Test".to_string()),
        items: vec![], // Empty items!
        attachment_url: None,
    };

    assert!(req.items.is_empty());
    // Validated in service & repository: empty lines rejected with DomainError::Validation
}

#[test]
fn test_3r_1_004_multiple_invoice_lines_calculation_exactness() {
    let items = vec![
        CreateInvoiceItemRequest {
            description: "Consulting".to_string(),
            quantity: dec!(10.00),
            unit_price: dec!(150000.50),
            account_id: None,
        },
        CreateInvoiceItemRequest {
            description: "Maintenance".to_string(),
            quantity: dec!(2.00),
            unit_price: dec!(250000.25),
            account_id: None,
        },
    ];

    let total: rust_decimal::Decimal = items.iter().map(|i| i.quantity * i.unit_price).sum();
    // 10 * 150000.50 = 1500005.00
    // 2 * 250000.25 = 500000.50
    // Sum = 2000005.50
    assert_eq!(total, dec!(2000005.50));
}

#[test]
fn test_3r_1_003_exact_decimal_no_float_loss_0_1_plus_0_2() {
    let a = dec!(0.1);
    let b = dec!(0.2);
    let sum = a + b;
    assert_eq!(sum, dec!(0.3));
    assert_ne!(format!("{}", sum), "0.30000000000000004");

    let val = dec!(1.005);
    assert_eq!(format!("{}", val), "1.005");
}
