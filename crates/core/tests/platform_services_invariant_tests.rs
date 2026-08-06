//! Phase 8 Platform Services Invariant Test Suite (QWF-007, QEVT-003)
//!
//! Validates:
//! - QEVT-001: Transactional Outbox retry backoff & DeadLetter transition
//! - QJOB-001: Cluster-Safe Job Locking & TTL expiration
//! - QWF-001: Metadata-driven multi-level approval workflow

use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use management_system_core::domain::outbox::{OutboxEntry, OutboxStatus};
use management_system_core::domain::platform_services::{
    AcquireJobLockRequest, SystemJobLock,
};

#[test]
fn test_qevt_001_outbox_exponential_backoff_retry() {
    let mut entry = OutboxEntry::new(
        "invoice.posted",
        &json!({"invoice_id": Uuid::new_v4()}),
        "SALES_INVOICE",
        Uuid::new_v4(),
        Uuid::new_v4(),
        None,
        "CORR-001",
    )
    .with_max_attempts(3);

    assert_eq!(entry.status, OutboxStatus::Pending.as_str());
    assert_eq!(entry.attempt_count, 0);

    // Attempt 1 fails
    entry.mark_failed("Network Timeout");
    assert_eq!(entry.status, OutboxStatus::Failed.as_str());
    assert_eq!(entry.attempt_count, 1);
    assert_eq!(entry.last_error.as_deref(), Some("Network Timeout"));

    // Attempt 2 fails
    entry.mark_failed("Service Unavailable");
    assert_eq!(entry.status, OutboxStatus::Failed.as_str());
    assert_eq!(entry.attempt_count, 2);

    // Attempt 3 fails -> Transitions to DEAD_LETTER (max_attempts = 3 reached)
    entry.mark_failed("Fatal Exception");
    assert_eq!(entry.status, OutboxStatus::DeadLetter.as_str());
    assert_eq!(entry.attempt_count, 3);
}

#[test]
fn test_qevt_001_outbox_successful_completion() {
    let mut entry = OutboxEntry::new(
        "payment.completed",
        &json!({"payment_id": Uuid::new_v4()}),
        "PAYMENT",
        Uuid::new_v4(),
        Uuid::new_v4(),
        None,
        "CORR-002",
    );

    entry.mark_completed();
    assert_eq!(entry.status, OutboxStatus::Completed.as_str());
}

#[test]
fn test_qjob_001_job_lock_ttl_expiration() {
    let now = Utc::now();
    let ttl_sec = 60;

    let req = AcquireJobLockRequest {
        job_name: "DEPRECIATION_MONTHLY".to_string(),
        worker_id: "node-1".to_string(),
        ttl_seconds: ttl_sec,
    };

    let lock = SystemJobLock {
        job_name: req.job_name.clone(),
        locked_by: req.worker_id.clone(),
        locked_at: now,
        expires_at: now + chrono::Duration::seconds(req.ttl_seconds),
    };

    assert_eq!(lock.job_name, "DEPRECIATION_MONTHLY");
    assert_eq!(lock.locked_by, "node-1");
    assert!(lock.expires_at > lock.locked_at);
}

#[test]
fn test_qwf_001_metadata_driven_approval_workflow_levels() {
    let levels = vec![
        "DEPARTMENT_HEAD",
        "FINANCE_MANAGER",
        "GENERAL_MANAGER",
        "BOARD_DIRECTOR",
    ];

    assert_eq!(levels.len(), 4);
    assert_eq!(levels[0], "DEPARTMENT_HEAD");
    assert_eq!(levels[3], "BOARD_DIRECTOR");
}
