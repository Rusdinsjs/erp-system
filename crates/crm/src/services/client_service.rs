use uuid::Uuid;

use crate::domain::entities::Client;
use crate::repositories::ClientRepository;
use management_system_core::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ClientService {
    client_repo: ClientRepository,
}

impl ClientService {
    pub fn new(client_repo: ClientRepository) -> Self {
        Self { client_repo }
    }

    /// Create a new client
    pub async fn create_client(&self, client: Client) -> DomainResult<Client> {
        // Validate unique code if provided
        if let Some(existing) = self
            .client_repo
            .find_by_code(&client.client_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        {
            return Err(DomainError::business_rule(
                "client_code",
                &format!("Client with code '{}' already exists", existing.client_code),
            ));
        }

        self.client_repo
            .create(&client)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
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

    /// List clients with pagination
    pub async fn list_clients(&self, limit: i64, offset: i64) -> DomainResult<(Vec<Client>, i64)> {
        let clients = self.client_repo.list(limit, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        let total =
            self.client_repo
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok((clients, total))
    }

    /// Update client details
    pub async fn update_client(&self, id: Uuid, mut client: Client) -> DomainResult<Client> {
        // Ensure ID matches
        client.id = id;

        // Check if client exists
        let _existing = self.get_client(id).await?;

        self.client_repo
            .update(&client)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Search clients
    pub async fn search_clients(&self, query: &str, limit: i64) -> DomainResult<Vec<Client>> {
        self.client_repo
            .search(query, limit)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete client (hard delete if no references exist, or force delete references if in use)
    pub async fn delete_client(&self, id: Uuid) -> DomainResult<bool> {
        let _existing = self.get_client(id).await?;

        match self.client_repo.delete(id).await {
            Ok(true) => Ok(true), // Permanently deleted
            Ok(false) => Err(DomainError::not_found("Client", id)),
            Err(_) => {
                // Perform force delete to clean up dependent records and delete client
                self.client_repo.force_delete(id).await.map_err(|err| {
                    DomainError::ExternalServiceError {
                        service: "database".to_string(),
                        message: err.to_string(),
                    }
                })
            }
        }
    }
}
