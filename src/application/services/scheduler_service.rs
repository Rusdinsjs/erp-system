//! Scheduler Service
//!
//! Manages background jobs and scheduled tasks.

use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};

use crate::application::services::{LoanService, MaintenanceService};

/// Scheduler service
#[derive(Clone)]
pub struct SchedulerService {
    loan_service: LoanService,
    maintenance_service: MaintenanceService,
}

impl SchedulerService {
    pub fn new(loan_service: LoanService, maintenance_service: MaintenanceService) -> Self {
        Self {
            loan_service,
            maintenance_service,
        }
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let sched = JobScheduler::new().await?;

        // Job 1: Check overdue loans daily at 00:00
        let loan_service = self.loan_service.clone();
        sched
            .add(Job::new_async("0 0 0 * * *", move |_uuid, _l| {
                let service = loan_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Check Overdue Loans");
                    // Implement strict checking logic here if needed,
                    // currently we rely on list_overdue_loans or similar
                    // But usually we want to explicitely ACTION on them (e.g. update status)
                    // For now, we'll just log. In a real app we'd call a specific batch process method.
                    match service.check_overdue_loans().await {
                        Ok(_) => info!("Overdue loans check completed"),
                        Err(e) => error!("Error checking overdue loans: {}", e),
                    }
                })
            })?)
            .await?;

        // Job 2: Check maintenance due daily at 01:00
        let maintenance_service = self.maintenance_service.clone();
        sched
            .add(Job::new_async("0 0 1 * * *", move |_uuid, _l| {
                let service = maintenance_service.clone();
                Box::pin(async move {
                    info!("Running scheduled job: Check Maintenance Due");
                    match service.check_upcoming_maintenance().await {
                        // We need to implement this
                        Ok(_) => info!("Maintenance check completed"),
                        Err(e) => error!("Error checking maintenance: {}", e),
                    }
                })
            })?)
            .await?;

        sched.start().await?;
        info!("Scheduler started");

        Ok(())
    }
}
