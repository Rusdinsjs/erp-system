use management_system::api::handlers::notification_ws::WebSocketManager;
use management_system::application::dto::CreateAssetRequest;
use management_system::application::services::{
    ApprovalService, AssetService, NotificationService,
};
use management_system::infrastructure::cache::{CacheError, CacheOperations};
use management_system::infrastructure::repositories::{
    ApprovalRepository, AssetRepository, JournalRepository, NotificationRepository,
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use uuid::Uuid;

mod common;

/// Mock Cache for testing
#[derive(Debug)]
struct MockCache {
    storage: Mutex<HashMap<String, String>>,
}

impl MockCache {
    fn new() -> Self {
        Self {
            storage: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait::async_trait]
impl CacheOperations for MockCache {
    async fn get_raw(&self, key: &str) -> Result<Option<String>, CacheError> {
        let store = self.storage.lock().unwrap();
        Ok(store.get(key).cloned())
    }

    async fn set_raw(
        &self,
        key: &str,
        value: &str,
        _ttl: Option<Duration>,
    ) -> Result<(), CacheError> {
        let mut store = self.storage.lock().unwrap();
        store.insert(key.to_string(), value.to_string());
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<(), CacheError> {
        let mut store = self.storage.lock().unwrap();
        store.remove(key);
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool, CacheError> {
        let store = self.storage.lock().unwrap();
        Ok(store.contains_key(key))
    }

    async fn incr(&self, _key: &str, _ttl: Duration) -> Result<i64, CacheError> {
        Ok(1) // Not used in asset service explicitly for logic, but returning 1 to satisfy trait
    }

    async fn set_nx(
        &self,
        key: &str,
        value: &str,
        _ttl: Option<Duration>,
    ) -> Result<bool, CacheError> {
        let mut store = self.storage.lock().unwrap();
        if store.contains_key(key) {
            Ok(false)
        } else {
            store.insert(key.to_string(), value.to_string());
            Ok(true)
        }
    }
}

#[tokio::test]
async fn test_create_and_get_asset() {
    let pool = common::setup().await;

    let asset_repo = AssetRepository::new(pool.clone());
    let approval_repo = ApprovalRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());
    let approval_service = ApprovalService::new(approval_repo);
    let cache = Arc::new(MockCache::new());
    let notif_repo = NotificationRepository::new(pool.clone());
    let ws_manager = Arc::new(WebSocketManager::new());
    let notification_service = NotificationService::new(notif_repo, ws_manager);

    let asset_service = AssetService::new(
        asset_repo,
        journal_repo,
        cache,
        approval_service,
        notification_service,
    );

    // Test Data
    let unique = Uuid::new_v4();
    let asset_code = format!("TST-{}", unique);
    let name = "Test Asset Laptop".to_string();
    // Initial category setup logic moved below
    // Note: In integration test with real DB, FKs matter.
    // We should ideally create a category first or assume seeding.
    // Let's rely on common seeding or allow NULL if schema permits (schema usually requires valid FK).
    // Plan B: Create a category if needed.
    // For now, let's try assuming a seeded category or use random UUID if constraints aren't strict.
    // Actually, create_asset usually requires valid FKs.
    // Let's assume standard seeds exist or try insertion.
    // Logic: In a real test env, we'd query a category first.

    // Let's quickly insert a dummy category using raw sqlx to be safe
    let category_id = sqlx::query_scalar!(
        "INSERT INTO categories (id, name, code) VALUES ($1, 'Test Cat', $2) ON CONFLICT DO NOTHING RETURNING id",
        Uuid::new_v4(),
        format!("CAT-{}", unique)
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Uuid::new_v4()); // Fallback if insert failed (e.g. conflict handling, though new_v4 shouldn't conflict)

    let req = CreateAssetRequest {
        asset_code: asset_code.clone(),
        name: name.clone(),
        category_id,
        location_id: None,
        department: None,
        department_id: None,
        assigned_to: None,
        vendor_id: None,
        is_rental: Some(false),
        is_fuel: Some(false),
        is_loan: Some(false),
        asset_class: None,
        status: Some("Available".to_string()),
        condition_id: None,
        serial_number: None,
        brand: None,
        model: None,
        year_manufacture: None,
        specifications: None,
        purchase_date: None,
        purchase_price: None,
        currency_id: None,
        unit_id: None,
        quantity: None,
        residual_value: None,
        useful_life_months: None,
        notes: None,
        vehicle_details: None,
    };

    // 1. Create Asset (Role Level 1 = Admin, auto-approve)
    let result = asset_service.create(req.clone(), Uuid::new_v4(), 1).await;
    assert!(result.is_ok(), "Failed to create asset: {:?}", result.err());

    let asset = match result.unwrap() {
        management_system::application::services::AssetOperationResult::Success(a) => a,
        _ => panic!("Expected Success result"),
    };

    assert_eq!(asset.asset_code, asset_code);
    assert_eq!(asset.name, name);

    // 2. Get Asset by ID
    let fetched = asset_service.get_by_id(asset.id).await;
    assert!(fetched.is_ok());
    assert_eq!(fetched.unwrap().id, asset.id);

    // 3. Duplicate Code Check
    let dup_result = asset_service.create(req, Uuid::new_v4(), 1).await;
    assert!(dup_result.is_err(), "Should fail on duplicate asset code");
}
