use crate::domain::entities::Location;
use crate::infrastructure::repositories::LocationRepository;
use uuid::Uuid;

#[derive(Clone)]
pub struct LocationService {
    repository: LocationRepository,
}

impl LocationService {
    pub fn new(repository: LocationRepository) -> Self {
        Self { repository }
    }

    pub async fn list_locations(&self) -> Result<Vec<Location>, String> {
        self.repository.list().await.map_err(|e| e.to_string())
    }

    pub async fn get_location(&self, id: Uuid) -> Result<Option<Location>, String> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn create_location(&self, location: Location) -> Result<Location, String> {
        self.repository
            .create(&location)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn update_location(&self, location: Location) -> Result<Location, String> {
        self.repository
            .update(&location)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn delete_location(&self, id: Uuid) -> Result<bool, String> {
        self.repository.delete(id).await.map_err(|e| e.to_string())
    }

    pub async fn get_hierarchy(&self) -> Result<serde_json::Value, String> {
        let locations = self.list_locations().await?;
        // Simple hierarchy builder (flat list for now, or build tree if needed)
        // For now preventing compilation error is key.
        Ok(serde_json::json!(locations))
    }
}
