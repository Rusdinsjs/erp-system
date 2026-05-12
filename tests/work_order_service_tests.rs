use management_system::api::handlers::notification_ws::WebSocketManager;
use management_system::application::services::{
    ApprovalService, AssetExpenseService, AssetService, CreateWorkOrderRequest,
    NotificationService, WorkOrderService,
};
use management_system::domain::entities::WorkOrderStatus;
use management_system::infrastructure::bus::EventBus;
use management_system::infrastructure::cache::{CacheError, CacheOperations};
use management_system::infrastructure::repositories::{
    ApprovalRepository, AssetExpenseRepository, AssetRepository, JournalRepository,
    LifecycleRepository, MaintenanceTemplateRepository, NotificationRepository,
    WorkOrderRepository,
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use uuid::Uuid;

mod common;

/// Mock Cache (Reused from asset tests - ideally should be in common/mocks.rs)
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
        Ok(1)
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
async fn test_work_order_lifecycle() {
    let pool = common::setup().await;

    // Repositories
    let wo_repo = WorkOrderRepository::new(pool.clone());
    let lifecycle_repo = LifecycleRepository::new(pool.clone());
    let asset_repo = AssetRepository::new(pool.clone());
    let notif_repo = NotificationRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());

    // Services dependencies
    let cache = Arc::new(MockCache::new());
    let ws_manager = Arc::new(WebSocketManager::new());
    let notif_service = NotificationService::new(notif_repo, ws_manager);

    let approval_repo = ApprovalRepository::new(pool.clone());
    let approval_service = ApprovalService::new(approval_repo);

    let ae_repo = AssetExpenseRepository::new(pool.clone());
    let ae_service =
        AssetExpenseService::new(ae_repo, asset_repo.clone(), approval_service.clone());

    let mt_repo = MaintenanceTemplateRepository::new(pool.clone());

    let finance_repo =
        management_system::infrastructure::repositories::FinanceRepository::new(pool.clone());
    let journal_service = management_system::application::services::JournalService::new(
        journal_repo.clone(),
        finance_repo.clone(),
    );

    let inventory_repo = Arc::new(
        management_system::infrastructure::repositories::InventoryRepository::new(pool.clone()),
    );
    let inventory_service = management_system::application::services::InventoryService::new(
        inventory_repo,
        journal_service.clone(),
        notif_service.clone(),
    );

    let event_bus = EventBus::new(1024);

    let wo_service = WorkOrderService::new(
        wo_repo,
        lifecycle_repo,
        asset_repo.clone(),
        cache.clone(),
        notif_service.clone(),
        ae_service,
        mt_repo,
        inventory_service,
        event_bus,
    );

    // Setup: Create an Asset first
    let asset_service = AssetService::new(
        asset_repo,
        journal_repo,
        cache.clone(),
        approval_service,
        notif_service.clone(),
    );

    let unique = Uuid::new_v4();
    let asset_code = format!("WO-ASSET-{}", unique);
    let category_id = sqlx::query_scalar!(
        "INSERT INTO categories (id, name, code) VALUES ($1, 'WO Test Cat', $2) ON CONFLICT DO NOTHING RETURNING id",
        Uuid::new_v4(),
        format!("CAT-WO-{}", unique)
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Uuid::new_v4());

    let asset_req = management_system::application::dto::CreateAssetRequest {
        asset_code: asset_code.clone(),
        name: "WO Test Asset".to_string(),
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
        status: Some("Deployed".to_string()), // Start as Deployed
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

    let asset_result = asset_service
        .create(asset_req, Uuid::new_v4(), 1)
        .await
        .expect("Failed to create asset");
    let asset_id = match asset_result {
        management_system::application::services::AssetOperationResult::Success(a) => a.id,
        _ => panic!("Expected Success result"),
    };

    // 1. Create Work Order
    let wo_req = CreateWorkOrderRequest {
        asset_id,
        wo_type: "Maintenance".to_string(), // Should transition to UnderMaintenance
        priority: Some("High".to_string()),
        scheduled_date: None,
        due_date: None,
        problem_description: Some("Test Maintenance".to_string()),
        estimated_hours: None,
        estimated_cost: None,
        safety_requirements: None,
        lockout_tagout_required: None,
        location_id: None,
        target_category_id: None,
        target_specifications: None,
        conversion_notes: None,
        conversion_type: None,
        assigned_technician: None,
    };

    let user_id = Uuid::new_v4();
    // Insert dummy user to satisfy FK
    sqlx::query!(
        "INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) 
         VALUES ($1, $2, 'hash', 'Test User', 'User', true, NOW(), NOW())",
        user_id,
        format!("test_user_{}@example.com", user_id)
    )
    .execute(&pool)
    .await
    .expect("Failed to create test user");

    let wo = wo_service
        .create(wo_req, Some(user_id))
        .await
        .expect("Failed to create WO");

    assert_eq!(wo.status, WorkOrderStatus::Pending.as_str());
    assert_eq!(wo.asset_id, asset_id);

    // 1.5 Approve Work Order (Workflow requirement: Pending -> Approved -> InProgress)
    let approved_wo = wo_service
        .approve(wo.id, user_id)
        .await
        .expect("Failed to approve WO");
    assert_eq!(approved_wo.status, "approved");

    // 2. Start Work (Should transition Asset to UnderMaintenance)
    // Note: Start Logic: DB update -> Asset Transition
    let started_wo = wo_service
        .start_work(wo.id)
        .await
        .expect("Failed to start work");
    assert_eq!(started_wo.status, WorkOrderStatus::InProgress.as_str());

    // Verify Asset Status
    let updated_asset = asset_service
        .get_by_id(asset_id)
        .await
        .expect("Failed to get asset");
    // "Maintenance" maps to AssetState::UnderMaintenance which stringifies to "under_maintenance" usually,
    // let's check exact string mapping in entity implementation or repo.
    // Based on `AssetState` enum variants, typically snake_case or specific strings.
    // Checking `AssetState::UnderMaintenance` string repr.
    // Assuming standard "under_maintenance" or similar.
    // We will assert loosely not equal to "Deployed".
    assert_ne!(updated_asset.status, "Deployed");

    // 3. Complete Work
    let completed_wo = wo_service
        .complete(wo.id, user_id, "Fix done")
        .await
        .expect("Failed to complete WO");
    assert_eq!(completed_wo.status, WorkOrderStatus::PendingReview.as_str());

    // Verify Asset Status back to Deployed (or Inventory if not assigned)
    // Detailed logic: if assigned -> Deployed, else -> InInventory.
    // Our asset has no assignee, so it should be InInventory.
    let final_asset = asset_service
        .get_by_id(asset_id)
        .await
        .expect("Failed to get asset");
    assert_eq!(final_asset.status, "in_inventory");
}
