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

    pub async fn update_category(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        inventory_account_id: Option<Uuid>,
        expense_account_id: Option<Uuid>,
    ) -> Result<InventoryCategory, sqlx::Error> {
        sqlx::query_as::<_, InventoryCategory>(
            "UPDATE inventory_categories 
             SET name = COALESCE($2, name), 
                 description = COALESCE($3, description), 
                 inventory_account_id = COALESCE($4, inventory_account_id), 
                 expense_account_id = COALESCE($5, expense_account_id),
                 updated_at = NOW()
             WHERE id = $1 RETURNING *"
        )
        .bind(id)
        .bind(name)
        .bind(description)
        .bind(inventory_account_id)
        .bind(expense_account_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete_category(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM inventory_categories WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
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
        search: Option<String>,
    ) -> Result<Vec<InventoryItem>, sqlx::Error> {
        let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
            sqlx::QueryBuilder::new("SELECT * FROM inventory_items WHERE is_active = true");

        if let Some(category_id) = category_id {
            query_builder.push(" AND category_id = ");
            query_builder.push_bind(category_id);
        }

        if let Some(search) = search {
            if !search.is_empty() {
                query_builder.push(" AND (name ILIKE ");
                query_builder.push_bind(format!("%{}%", search));
                query_builder.push(" OR sku ILIKE ");
                query_builder.push_bind(format!("%{}%", search));
                query_builder.push(")");
            }
        }

        query_builder.push(" ORDER BY name");

        query_builder.build_query_as::<InventoryItem>().fetch_all(&self.pool).await
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

    pub async fn update_item(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        min_stock: Option<rust_decimal::Decimal>,
        max_stock: Option<rust_decimal::Decimal>,
        is_active: Option<bool>,
    ) -> Result<InventoryItem, sqlx::Error> {
        sqlx::query_as::<_, InventoryItem>(
            "UPDATE inventory_items 
             SET name = COALESCE($2, name), 
                 description = COALESCE($3, description), 
                 min_stock = COALESCE($4, min_stock), 
                 max_stock = COALESCE($5, max_stock),
                 is_active = COALESCE($6, is_active),
                 updated_at = NOW()
             WHERE id = $1 RETURNING *"
        )
        .bind(id)
        .bind(name)
        .bind(description)
        .bind(min_stock)
        .bind(max_stock)
        .bind(is_active)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete_item(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // We usually do soft delete for items that have history
        let result = sqlx::query("UPDATE inventory_items SET is_active = false, updated_at = NOW() WHERE id = $1")
            .bind(id)
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

    pub async fn list_movements(
        &self,
        item_id: Option<Uuid>,
        limit: i64,
    ) -> Result<Vec<InventoryMovement>, sqlx::Error> {
        let mut query_builder: sqlx::QueryBuilder<sqlx::Postgres> =
            sqlx::QueryBuilder::new("SELECT * FROM inventory_movements");

        if let Some(item_id) = item_id {
            query_builder.push(" WHERE item_id = ");
            query_builder.push_bind(item_id);
        }

        query_builder.push(" ORDER BY created_at DESC LIMIT ");
        query_builder.push_bind(limit);

        query_builder
            .build_query_as::<InventoryMovement>()
            .fetch_all(&self.pool)
            .await
    }
}
