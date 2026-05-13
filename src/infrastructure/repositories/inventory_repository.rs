use crate::domain::entities::inventory::{InventoryCategory, InventoryItem, InventoryMovement};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct InventoryRepository {
    pool: PgPool,
}

impl InventoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // --- Categories ---

    pub async fn create_category(
        &self,
        category: &InventoryCategory,
    ) -> Result<InventoryCategory, sqlx::Error> {
        sqlx::query_as::<_, InventoryCategory>(
            "INSERT INTO inventory_categories (id, code, name, description, inventory_account_id, expense_account_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"
        )
        .bind(category.id)
        .bind(&category.code)
        .bind(&category.name)
        .bind(&category.description)
        .bind(category.inventory_account_id)
        .bind(category.expense_account_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn list_categories(&self) -> Result<Vec<InventoryCategory>, sqlx::Error> {
        sqlx::query_as::<_, InventoryCategory>("SELECT * FROM inventory_categories ORDER BY name")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_category(&self, id: Uuid) -> Result<Option<InventoryCategory>, sqlx::Error> {
        sqlx::query_as::<_, InventoryCategory>("SELECT * FROM inventory_categories WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    // --- Items ---

    pub async fn create_item(&self, item: &InventoryItem) -> Result<InventoryItem, sqlx::Error> {
        sqlx::query_as::<_, InventoryItem>(
            "INSERT INTO inventory_items (id, category_id, unit_id, sku, name, description, min_stock, max_stock, current_quantity, average_cost, last_purchase_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *"
        )
        .bind(item.id)
        .bind(item.category_id)
        .bind(item.unit_id)
        .bind(&item.sku)
        .bind(&item.name)
        .bind(&item.description)
        .bind(item.min_stock)
        .bind(item.max_stock)
        .bind(item.current_quantity)
        .bind(item.average_cost)
        .bind(item.last_purchase_price)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_item(&self, id: Uuid) -> Result<Option<InventoryItem>, sqlx::Error> {
        sqlx::query_as::<_, InventoryItem>("SELECT * FROM inventory_items WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_items(
        &self,
        category_id: Option<Uuid>,
    ) -> Result<Vec<InventoryItem>, sqlx::Error> {
        let mut query = "SELECT * FROM inventory_items WHERE is_active = true".to_string();
        if category_id.is_some() {
            query.push_str(" AND category_id = $1");
        }
        query.push_str(" ORDER BY name");

        let q = sqlx::query_as::<_, InventoryItem>(&query);
        if let Some(cid) = category_id {
            q.bind(cid).fetch_all(&self.pool).await
        } else {
            q.fetch_all(&self.pool).await
        }
    }

    pub async fn update_stock(
        &self,
        id: Uuid,
        new_quantity: rust_decimal::Decimal,
        new_average_cost: rust_decimal::Decimal,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE inventory_items SET current_quantity = $2, average_cost = $3, updated_at = NOW() WHERE id = $1"
        )
        .bind(id)
        .bind(new_quantity)
        .bind(new_average_cost)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // --- Movements ---

    pub async fn create_movement(
        &self,
        movement: &InventoryMovement,
    ) -> Result<InventoryMovement, sqlx::Error> {
        sqlx::query_as::<_, InventoryMovement>(
            "INSERT INTO inventory_movements (id, item_id, movement_type, quantity, unit_price, total_value, reference_id, reference_number, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *"
        )
        .bind(movement.id)
        .bind(movement.item_id)
        .bind(&movement.movement_type)
        .bind(movement.quantity)
        .bind(movement.unit_price)
        .bind(movement.total_value)
        .bind(movement.reference_id)
        .bind(&movement.reference_number)
        .bind(&movement.notes)
        .bind(movement.created_by)
        .fetch_one(&self.pool)
        .await
    }

    // --- Documents ---

    pub async fn create_document(
        &self,
        document: &crate::domain::entities::inventory::InventoryDocument,
    ) -> Result<crate::domain::entities::inventory::InventoryDocument, sqlx::Error> {
        sqlx::query_as::<_, crate::domain::entities::inventory::InventoryDocument>(
            r#"
            INSERT INTO inventory_documents (id, item_id, name, type, file_path, mime_type, size_bytes, expiry_date, notes, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(document.id)
        .bind(document.item_id)
        .bind(&document.name)
        .bind(&document.type_)
        .bind(&document.file_path)
        .bind(&document.mime_type)
        .bind(document.size_bytes)
        .bind(document.expiry_date)
        .bind(&document.notes)
        .bind(document.uploaded_by)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn find_documents_by_item_id(
        &self,
        item_id: Uuid,
    ) -> Result<Vec<crate::domain::entities::inventory::InventoryDocument>, sqlx::Error> {
        sqlx::query_as::<_, crate::domain::entities::inventory::InventoryDocument>(
            "SELECT * FROM inventory_documents WHERE item_id = $1 ORDER BY created_at DESC",
        )
        .bind(item_id)
        .fetch_all(&self.pool)
        .await
    }
}
}
