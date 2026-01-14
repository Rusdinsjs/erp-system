//! Rental Service
//!
//! Business logic for Rented-Out (external asset rental) operations.

use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::application::dto::{
    ApproveRentalRequest, CreateClientRequest, CreateRentalRateRequest, CreateRentalRequest,
    DispatchRentalRequest, RejectRentalRequest, ReturnRentalRequest, UpdateRentalRateRequest,
};
use crate::domain::entities::{Client, Rental, RentalHandover, RentalRate};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, ClientRepository, RentalRepository};

#[derive(Clone)]
pub struct RentalService {
    rental_repo: RentalRepository,
    client_repo: ClientRepository,
    asset_repo: AssetRepository,
}

impl RentalService {
    pub fn new(
        rental_repo: RentalRepository,
        client_repo: ClientRepository,
        asset_repo: AssetRepository,
    ) -> Self {
        Self {
            rental_repo,
            client_repo,
            asset_repo,
        }
    }

    // ==================== RENTAL OPERATIONS ====================

    /// Create a new rental request
    pub async fn create_rental(
        &self,
        request: CreateRentalRequest,
        requested_by: Uuid,
    ) -> DomainResult<Rental> {
        // 1. Validate asset exists and is available
        let asset = self
            .asset_repo
            .find_by_id(request.asset_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", request.asset_id))?;

        // Check asset is in inventory (can be rented)
        if asset.status != "in_inventory" && asset.status != "deployed" {
            return Err(DomainError::business_rule(
                "asset_availability",
                &format!(
                    "Asset status is '{}', must be 'in_inventory' or 'deployed' to rent",
                    asset.status
                ),
            ));
        }

        // 2. Validate client exists
        let client = self
            .client_repo
            .find_by_id(request.client_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
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

        // 3. Create rental
        let mut rental = Rental::new(request.asset_id, request.client_id, requested_by);
        rental.start_date = request.start_date;
        rental.expected_end_date = request.expected_end_date;
        rental.daily_rate = request.daily_rate;
        rental.deposit_amount = request.deposit_amount;
        rental.notes = request.notes;

        let created_rental = self.rental_repo.create(&rental).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(created_rental)
    }

    /// Approve a rental request
    pub async fn approve_rental(
        &self,
        id: Uuid,
        approved_by: Uuid,
        request: ApproveRentalRequest,
    ) -> DomainResult<Rental> {
        let rental = self.get_by_id(id).await?;

        if !rental.can_approve() {
            return Err(DomainError::business_rule(
                "rental_status",
                &format!("Cannot approve rental with status '{}'", rental.status),
            ));
        }

        self.rental_repo
            .approve(
                id,
                approved_by,
                request.start_date,
                request.expected_end_date,
                request.daily_rate,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    /// Reject a rental request
    pub async fn reject_rental(
        &self,
        id: Uuid,
        request: RejectRentalRequest,
    ) -> DomainResult<Rental> {
        let rental = self.get_by_id(id).await?;

        if !rental.can_approve() {
            return Err(DomainError::business_rule(
                "rental_status",
                "Can only reject rentals with 'requested' status",
            ));
        }

        self.rental_repo
            .reject(id, &request.reason)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    /// Dispatch rental (handover out to client)
    pub async fn dispatch_rental(
        &self,
        id: Uuid,
        dispatched_by: Uuid,
        request: DispatchRentalRequest,
    ) -> DomainResult<Rental> {
        let rental = self.get_by_id(id).await?;

        if !rental.can_dispatch() {
            return Err(DomainError::business_rule(
                "rental_status",
                "Can only dispatch rentals with 'approved' status",
            ));
        }

        // 1. Create handover record
        let mut handover = RentalHandover::new_dispatch(id, dispatched_by);
        handover.condition_rating = Some(request.condition_rating);
        handover.condition_notes = request.condition_notes;
        if let Some(photos) = request.photos {
            handover.photos = Some(serde_json::json!(photos));
        }

        self.rental_repo
            .create_handover(&handover)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 2. Update rental status
        self.rental_repo
            .dispatch(id, dispatched_by, None)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 3. Update asset status to rented_out
        let _ = self
            .asset_repo
            .update_status(rental.asset_id, "rented_out")
            .await;

        // 4. Update asset location if provided
        if let Some(loc_id) = request.location_id {
            let _ = self
                .asset_repo
                .update_location(rental.asset_id, loc_id)
                .await;
        }

        self.get_by_id(id).await
    }

    /// Return rental (handover in from client)
    pub async fn return_rental(
        &self,
        id: Uuid,
        returned_by: Uuid,
        request: ReturnRentalRequest,
    ) -> DomainResult<Rental> {
        let rental = self.get_by_id(id).await?;

        if !rental.can_return() {
            return Err(DomainError::business_rule(
                "rental_status",
                "Can only return rentals with 'rented_out' or 'overdue' status",
            ));
        }

        // 1. Create return handover record
        let mut handover = RentalHandover::new_return(id, returned_by);
        handover.condition_rating = Some(request.condition_rating);
        handover.condition_notes = request.condition_notes;
        handover.has_damage = Some(request.has_damage);
        handover.damage_description = request.damage_description;
        if let Some(photos) = request.photos {
            handover.photos = Some(serde_json::json!(photos));
        }
        if let Some(damage_photos) = request.damage_photos {
            handover.damage_photos = Some(serde_json::json!(damage_photos));
        }

        self.rental_repo
            .create_handover(&handover)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 2. Calculate billing
        let actual_end_date = Utc::now().date_naive();
        let start_date = rental.start_date.unwrap_or(rental.request_date);
        let total_days = (actual_end_date - start_date).num_days() as i32;
        let daily_rate = rental.daily_rate.unwrap_or(Decimal::ZERO);
        let subtotal = daily_rate * Decimal::from(total_days.max(1));

        // Calculate penalty if overdue
        let mut penalty = Decimal::ZERO;
        if let Some(expected_end) = rental.expected_end_date {
            if actual_end_date > expected_end {
                let overdue_days = (actual_end_date - expected_end).num_days();
                // Default late fee: 10% of daily rate per overdue day
                let late_fee = daily_rate * Decimal::from_str_exact("0.1").unwrap_or(Decimal::ZERO);
                penalty = late_fee * Decimal::from(overdue_days);
            }
        }

        let total_amount = subtotal + penalty;

        // 3. Update rental
        self.rental_repo
            .return_rental(
                id,
                returned_by,
                actual_end_date,
                total_days,
                subtotal,
                penalty,
                total_amount,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 4. Update asset status back to in_inventory
        let _ = self
            .asset_repo
            .update_status(rental.asset_id, "in_inventory")
            .await;

        // 5. Update asset location if provided
        if let Some(loc_id) = request.location_id {
            let _ = self
                .asset_repo
                .update_location(rental.asset_id, loc_id)
                .await;
        }

        self.get_by_id(id).await
    }

    /// Get rental by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<Rental> {
        self.rental_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", id))
    }

    /// List rentals with pagination
    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<Rental>> {
        let offset = (page - 1) * per_page;
        self.rental_repo.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// List pending rentals
    pub async fn list_pending(&self) -> DomainResult<Vec<Rental>> {
        self.rental_repo
            .list_pending()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List overdue rentals
    pub async fn list_overdue(&self) -> DomainResult<Vec<Rental>> {
        self.rental_repo
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get handovers for a rental
    pub async fn get_handovers(&self, rental_id: Uuid) -> DomainResult<Vec<RentalHandover>> {
        self.rental_repo
            .get_handovers(rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    // ==================== CLIENT OPERATIONS ====================

    /// Create a new client
    pub async fn create_client(&self, request: CreateClientRequest) -> DomainResult<Client> {
        let mut client = Client::new(request.name, request.company_name);
        client.email = request.email;
        client.phone = request.phone;
        client.address = request.address;
        client.city = request.city;
        client.contact_person = request.contact_person;
        client.tax_id = request.tax_id;
        client.notes = request.notes;

        self.client_repo
            .create(&client)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List clients
    pub async fn list_clients(&self, page: i64, per_page: i64) -> DomainResult<Vec<Client>> {
        let offset = (page - 1) * per_page;
        self.client_repo.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// Get client by ID
    pub async fn get_client(&self, id: Uuid) -> DomainResult<Client> {
        self.client_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Client", id))
    }

    // ==================== RENTAL RATE OPERATIONS ====================

    /// Create rental rate
    pub async fn create_rate(&self, request: CreateRentalRateRequest) -> DomainResult<RentalRate> {
        let mut rate = RentalRate::new(request.name, request.rate_type, request.rate_amount);
        rate.category_id = request.category_id;
        rate.asset_id = request.asset_id;
        if let Some(currency) = request.currency {
            rate.currency = Some(currency);
        }
        if let Some(min_dur) = request.minimum_duration {
            rate.minimum_duration = Some(min_dur);
        }
        rate.deposit_percentage = request.deposit_percentage;
        rate.late_fee_per_day = request.late_fee_per_day;

        // Enhanced billing
        if let Some(basis) = request.rate_basis {
            rate.rate_basis = Some(basis);
        }
        if let Some(min_h) = request.minimum_hours {
            rate.minimum_hours = Some(min_h);
        }
        if let Some(ot) = request.overtime_multiplier {
            rate.overtime_multiplier = Some(ot);
        }
        if let Some(sb) = request.standby_multiplier {
            rate.standby_multiplier = Some(sb);
        }
        if let Some(penalty) = request.breakdown_penalty_per_day {
            rate.breakdown_penalty_per_day = Some(penalty);
        }
        if let Some(hpd) = request.hours_per_day {
            rate.hours_per_day = Some(hpd);
        }
        if let Some(dpm) = request.days_per_month {
            rate.days_per_month = Some(dpm);
        }

        self.rental_repo
            .create_rate(&rate)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// List rental rates
    pub async fn list_rates(&self) -> DomainResult<Vec<RentalRate>> {
        self.rental_repo
            .list_rates()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Update rental rate
    pub async fn update_rate(
        &self,
        id: Uuid,
        request: UpdateRentalRateRequest,
    ) -> DomainResult<RentalRate> {
        let mut rate = self
            .rental_repo
            .find_rate_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("RentalRate", id))?;

        if let Some(name) = request.name {
            rate.name = name;
        }
        if let Some(cat_id) = request.category_id {
            rate.category_id = Some(cat_id);
        }
        if let Some(asset_id) = request.asset_id {
            rate.asset_id = Some(asset_id);
        }
        if let Some(rate_type) = request.rate_type {
            rate.rate_type = rate_type;
        }
        if let Some(amount) = request.rate_amount {
            rate.rate_amount = amount;
        }
        if let Some(cur) = request.currency {
            rate.currency = Some(cur);
        }
        if let Some(min_dur) = request.minimum_duration {
            rate.minimum_duration = Some(min_dur);
        }
        if let Some(dep) = request.deposit_percentage {
            rate.deposit_percentage = Some(dep);
        }
        if let Some(fee) = request.late_fee_per_day {
            rate.late_fee_per_day = Some(fee);
        }
        if let Some(active) = request.is_active {
            rate.is_active = Some(active);
        }
        if let Some(basis) = request.rate_basis {
            rate.rate_basis = Some(basis);
        }
        if let Some(min_h) = request.minimum_hours {
            rate.minimum_hours = Some(min_h);
        }
        if let Some(ot) = request.overtime_multiplier {
            rate.overtime_multiplier = Some(ot);
        }
        if let Some(sb) = request.standby_multiplier {
            rate.standby_multiplier = Some(sb);
        }
        if let Some(penalty) = request.breakdown_penalty_per_day {
            rate.breakdown_penalty_per_day = Some(penalty);
        }
        if let Some(hpd) = request.hours_per_day {
            rate.hours_per_day = Some(hpd);
        }
        if let Some(dpm) = request.days_per_month {
            rate.days_per_month = Some(dpm);
        }

        self.rental_repo
            .update_rate(&rate)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete rental rate
    pub async fn delete_rate(&self, id: Uuid) -> DomainResult<()> {
        self.rental_repo
            .delete_rate(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Mark overdue rentals (for background job)
    pub async fn mark_overdue_rentals(&self) -> DomainResult<i64> {
        self.rental_repo
            .mark_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
