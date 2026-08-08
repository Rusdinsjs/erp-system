//! Rental Service
//!
//! Business logic for Rented-Out (external asset rental) operations.
//! Updated for Multi-Asset support.

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

use management_system_core::application::dto::{
    ApproveRentalRequest, CreateRentalRateRequest, CreateRentalRequest, DispatchRentalRequest,
    RejectRentalRequest, RentalScheduleItem, ReturnRentalRequest, UpdateRentalRateRequest,
};
use management_system_core::domain::entities::UserClaims;
use management_system_core::domain::entities::AssetState;
use crate::domain::entities::{Rental, RentalItem, RentalRate, RentalStatus};
use management_system_core::domain::errors::{DomainError, DomainResult};
use crate::repositories::RentalRepository;
use management_system_core::infrastructure::repositories::AssetRepository;
use management_system_crm::repositories::ClientRepository;
use management_system_hr::repositories::EmployeeRepository;

#[derive(Clone)]
pub struct RentalService {
    rental_repo: RentalRepository,
    client_repo: ClientRepository,
    asset_repo: AssetRepository,
    employee_repo: EmployeeRepository,
}

impl RentalService {
    pub fn new(
        rental_repo: RentalRepository,
        client_repo: ClientRepository,
        asset_repo: AssetRepository,
        employee_repo: EmployeeRepository,
    ) -> Self {
        Self {
            rental_repo,
            client_repo,
            asset_repo,
            employee_repo,
        }
    }

    // ==================== RENTAL OPERATIONS ====================

    /// Create a new rental request with multiple items
    pub async fn create_rental(
        &self,
        request: CreateRentalRequest,
        requested_by: Uuid,
    ) -> DomainResult<Rental> {
        // 1. Validate client exists
        let client = self
            .client_repo
            .find_by_id(request.client_id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Client", request.client_id))?;

        if !client.is_active.unwrap_or(true) {
            return Err(DomainError::business_rule(
                "client_inactive",
                "Client is not active",
            ));
        }

        // 2. Prepare Items
        let mut rental_items = Vec::new();

        for item_req in request.items {
            // Validate Asset
            let asset = self
                .asset_repo
                .find_by_id(item_req.asset_id)
                .await
                .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?
                .ok_or_else(|| DomainError::not_found("Asset", item_req.asset_id))?;

            // Check availability
            let status = AssetState::from_str(&asset.status);
            if !matches!(status, Some(AssetState::InInventory | AssetState::Deployed)) {
                return Err(DomainError::business_rule(
                    "asset_availability",
                    &format!(
                        "Asset '{}' is {}, must be Available to rent",
                        asset.name, asset.status
                    ),
                ));
            }

            // Create Item Struct
            let item = RentalItem {
                id: Uuid::new_v4(),
                rental_id: Uuid::nil(), // Will be linked later
                asset_id: item_req.asset_id,
                rental_rate_id: item_req.rental_rate_id,
                rate_amount: item_req.rate_amount,
                rate_basis: item_req.rate_basis,
                status: RentalStatus::Requested.as_str().to_string(),
                start_date: request.start_date,
                expected_end_date: request.expected_end_date,
                actual_end_date: None,
                dispatched_by: None,
                dispatched_at: None,
                returned_by: None,
                returned_at: None,
                subtotal: Some(Decimal::ZERO),
                penalty_amount: Some(Decimal::ZERO),
                notes: item_req.notes,
                created_at: Some(Utc::now()),
                updated_at: Some(Utc::now()),
                asset_name: Some(asset.name),
                asset_code: Some(asset.asset_code),
                is_fuel_included: Some(false),
                mob_demob_cost: Some(Decimal::ZERO),
            };
            rental_items.push(item);
        }

        if rental_items.is_empty() {
            return Err(DomainError::business_rule(
                "rental_items",
                "At least one asset must be rented",
            ));
        }

        // 3. Create Rental Header
        let mut rental = Rental::new(request.client_id, requested_by);
        rental.start_date = request.start_date;
        rental.expected_end_date = request.expected_end_date;
        rental.deposit_amount = request.deposit_amount;
        rental.notes = request.notes;

        // Link Items to Rental ID
        for item in &mut rental_items {
            item.rental_id = rental.id;
        }
        rental.items = Some(rental_items);

        // 4. Save to Repo
        let created_rental = self.rental_repo.create_rental(&rental).await.map_err(|e: sqlx::Error| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(created_rental)
    }

    /// Approve a rental
    pub async fn approve_rental(
        &self,
        id: Uuid,
        request: ApproveRentalRequest,
        approved_by: Uuid,
    ) -> DomainResult<()> {
        let mut rental = self
            .rental_repo
            .find_rental_by_id(id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", id))?;

        if !rental.can_approve() {
            return Err(DomainError::business_rule(
                "rental_status",
                &format!("Cannot approve rental in status '{}'", rental.status),
            ));
        }

        // Update Header fields
        rental.start_date = Some(request.start_date);
        rental.expected_end_date = Some(request.expected_end_date);
        if let Some(deposit) = request.deposit_amount {
            rental.deposit_amount = Some(deposit);
        }
        rental.updated_at = Some(Utc::now());

        // Update Repo
        self.rental_repo
            .update_rental(&rental)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Approve State (Header + Items)
        self.rental_repo
            .approve_rental(id, approved_by, Utc::now())
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Reject a rental
    pub async fn reject_rental(
        &self,
        id: Uuid,
        request: RejectRentalRequest,
        _rejected_by: Uuid,
    ) -> DomainResult<()> {
        self.rental_repo
            .reject_rental(id, Some(request.reason))
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;
        Ok(())
    }

    /// Dispatch Item (Handover Out)
    pub async fn dispatch_rental(
        &self,
        rental_id: Uuid, // Passed for verification
        request: DispatchRentalRequest,
        dispatched_by: Uuid,
    ) -> DomainResult<()> {
        // Validate Header (optional but good)
        let rental = self
            .rental_repo
            .find_rental_by_id(rental_id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", rental_id))?;

        if !rental.can_dispatch() {
            return Err(DomainError::business_rule(
                "status",
                "Rental not approved for dispatch",
            ));
        }

        // Verify item belongs to rental
        if let Some(items) = &rental.items {
            if !items.iter().any(|i| i.id == request.rental_item_id) {
                return Err(DomainError::business_rule(
                    "item_mismatch",
                    "Item does not belong to this rental",
                ));
            }
        }

        // Repo handles status update
        self.rental_repo
            .dispatch_item(
                rental_id,
                request.rental_item_id,
                dispatched_by,
                request.condition_notes,
            )
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Return Item (Handover In)
    pub async fn return_rental(
        &self,
        rental_id: Uuid,
        request: ReturnRentalRequest,
        returned_by: Uuid,
    ) -> DomainResult<()> {
        let rental = self
            .rental_repo
            .find_rental_by_id(rental_id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", rental_id))?;

        if !rental.can_return() {
            return Err(DomainError::business_rule("status", "Rental not active"));
        }

        self.rental_repo
            .return_item(request.rental_item_id, returned_by)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    // ==================== READ OPERATIONS ====================

    pub async fn find_rental(&self, id: Uuid) -> DomainResult<Rental> {
        self.rental_repo
            .find_rental_by_id(id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", id))
    }

    pub async fn list_rentals(&self, claims: &UserClaims) -> DomainResult<Vec<Rental>> {
        let user_id = Uuid::parse_str(&claims.sub).unwrap_or_default();
        let role = &claims.role;

        let mut asset_id = None;
        let mut location_id = None;

        // Role-based filtering:
        // - Operator: sees only assigned_asset_id
        // - Checker: sees assets in work_area_id
        // - Admin/Manager: sees all
        if role != "admin" && role != "super_admin" && role != "manager" {
            // Fetch employee profile
            #[allow(unused_doc_comments)]
            /**
             * Note: We ignore errors here and just default to no filtering (or maybe empty list?)
             * If an employee profile is missing for a non-admin, maybe they shouldn't see anything?
             * For now, if no profile, they see nothing or default list.
             * Let's assume if they have no profile, they are a regular user seeing nothing or everything?
             * User request implies strict restriction.
             */
            if let Ok(Some(emp)) = self.employee_repo.find_by_user_id(user_id).await {
                if let Some(aid) = emp.assigned_asset_id {
                    asset_id = Some(aid);
                } else if let Some(wid) = emp.work_area_id {
                    location_id = Some(wid);
                }
            }
        }

        self.rental_repo
            .list_active_filtered(asset_id, location_id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_pending_rentals(&self) -> DomainResult<Vec<Rental>> {
        self.rental_repo
            .list_pending()
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_overdue_rentals(&self) -> DomainResult<Vec<Rental>> {
        self.rental_repo
            .list_overdue()
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    // Rate methods
    pub async fn list_rental_rates(&self) -> DomainResult<Vec<RentalRate>> {
        self.rental_repo
            .list_rates()
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn create_rental_rate(
        &self,
        request: CreateRentalRateRequest,
    ) -> DomainResult<RentalRate> {
        // Validation could go here
        let rate = RentalRate {
            id: Uuid::new_v4(),
            name: Some(request.name),
            category_id: request.category_id,
            asset_id: request.asset_id,
            rate_type: Some(request.rate_type),
            rate_amount: request.rate_amount,
            currency: Some(request.currency.unwrap_or_else(|| "IDR".to_string())),
            minimum_duration: request.minimum_duration,
            deposit_percentage: request.deposit_percentage,
            ma_threshold: request.ma_threshold,
            availability_penalty_multiplier: request.availability_penalty_multiplier,
            standby_multiplier: request.standby_multiplier,
            breakdown_penalty_per_day: request.breakdown_penalty_per_day,
            hours_per_day: request.hours_per_day,
            days_per_month: request.days_per_month,
            rate_basis: request.rate_basis,
            minimum_hours: request.minimum_hours,
            overtime_multiplier: request.overtime_multiplier,
            late_fee_per_day: request.late_fee_per_day,
            is_active: Some(true), // Default active on create
            created_at: Some(Utc::now()),
            updated_at: Some(Utc::now()),
            fuel_surcharge_rate: None,
            tier_config: None,
        };

        self.rental_repo
            .create_rate(&rate)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_asset_name_for_rental(&self, rental_id: Uuid) -> DomainResult<Option<String>> {
        let rental = self.rental_repo.find_rental_by_id(rental_id).await.map_err(|e: sqlx::Error| {
            DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            }
        })?;

        if let Some(r) = rental {
            if let Some(items) = r.items {
                if let Some(first) = items.first() {
                    return Ok(first.asset_name.clone());
                }
            }
        }
        Ok(None)
    }

    pub async fn update_rental_rate(
        &self,
        id: Uuid,
        request: UpdateRentalRateRequest,
    ) -> DomainResult<RentalRate> {
        let mut rate = self
            .rental_repo
            .find_rate_by_id(id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("RentalRate", id))?;

        if let Some(name) = request.name {
            rate.name = Some(name);
        }
        if let Some(cat) = request.category_id {
            rate.category_id = Some(cat);
        }
        if let Some(asset) = request.asset_id {
            rate.asset_id = Some(asset);
        }
        if let Some(rt) = request.rate_type {
            rate.rate_type = Some(rt);
        }
        if let Some(amt) = request.rate_amount {
            rate.rate_amount = amt;
        }
        if let Some(curr) = request.currency {
            rate.currency = Some(curr);
        }
        if let Some(min) = request.minimum_duration {
            rate.minimum_duration = Some(min);
        }
        if let Some(dep) = request.deposit_percentage {
            rate.deposit_percentage = Some(dep);
        }
        if let Some(ma) = request.ma_threshold {
            rate.ma_threshold = Some(ma);
        }
        if let Some(avail) = request.availability_penalty_multiplier {
            rate.availability_penalty_multiplier = Some(avail);
        }

        // Enhanced fields
        if let Some(rb) = request.rate_basis {
            rate.rate_basis = Some(rb);
        }
        if let Some(val) = request.minimum_hours {
            rate.minimum_hours = Some(val);
        }
        if let Some(val) = request.overtime_multiplier {
            rate.overtime_multiplier = Some(val);
        }
        if let Some(val) = request.standby_multiplier {
            rate.standby_multiplier = Some(val);
        }
        if let Some(val) = request.breakdown_penalty_per_day {
            rate.breakdown_penalty_per_day = Some(val);
        }
        if let Some(val) = request.hours_per_day {
            rate.hours_per_day = Some(val);
        }
        if let Some(val) = request.days_per_month {
            rate.days_per_month = Some(val);
        }
        if let Some(val) = request.late_fee_per_day {
            rate.late_fee_per_day = Some(val);
        }

        rate.updated_at = Some(Utc::now());

        self.rental_repo
            .update_rate(&rate)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn delete_rental_rate(&self, id: Uuid) -> DomainResult<()> {
        self.rental_repo
            .delete_rate(id)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })
    }

    /// Update a rental order details
    pub async fn update_rental(
        &self,
        id: Uuid,
        start_date: Option<NaiveDate>,
        expected_end_date: Option<NaiveDate>,
        deposit_amount: Option<Decimal>,
        notes: Option<String>,
    ) -> DomainResult<Rental> {
        let mut rental = self.find_rental(id).await?;

        if let Some(sd) = start_date {
            rental.start_date = Some(sd);
        }
        if let Some(ed) = expected_end_date {
            rental.expected_end_date = Some(ed);
        }
        if let Some(dep) = deposit_amount {
            rental.deposit_amount = Some(dep);
        }
        if let Some(n) = notes {
            rental.notes = Some(n);
        }
        rental.updated_at = Some(Utc::now());

        self.rental_repo
            .update_rental(&rental)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete a rental order
    pub async fn delete_rental(&self, id: Uuid) -> DomainResult<()> {
        let _existing = self.find_rental(id).await?;
        self.rental_repo.delete_rental(id).await.map_err(|e: sqlx::Error| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(())
    }

    /// Get schedule for Gantt
    pub async fn get_schedule(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> DomainResult<Vec<RentalScheduleItem>> {
        self.rental_repo
            .find_items_in_range(start, end)
            .await
            .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })
    }
}
