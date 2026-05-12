#[tokio::test]
async fn seed_vehicle_reminders() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::PgPool::connect(&database_url).await?;

    let asset_id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();
    let stnk_expiry = now + chrono::Duration::days(5); // Expiring in 5 days
    let tax_expiry = now + chrono::Duration::days(25); // Expiring in 25 days
    let kir_expiry = now + chrono::Duration::days(45); // Not expiring yet (limit 30)

    let vehicle_details = serde_json::json!({
        "license_plate": "B 1234 DUMMY",
        "brand": "Toyota",
        "model": "Innova Reborn",
        "stnk_expiry": stnk_expiry.date_naive().to_string(),
        "tax_expiry": tax_expiry.date_naive().to_string(),
        "kir_expiry": kir_expiry.date_naive().to_string(),
        "asset_id": asset_id
    });

    println!("Inserting Dummy Vehicle...");

    sqlx::query!(
        r#"
        INSERT INTO assets (
            id, asset_code, name, category_id, status, 
            vehicle_details, created_at, updated_at, version,
            is_rental, is_fuel, is_loan
        )
        VALUES (
            $1, 'V-DUMMY-001', 'Toyota Innova Reborn (Dummy)', 
            (SELECT id FROM categories LIMIT 1), -- Just grab any category
            'available',
            $2, NOW(), NOW(), 1,
            false, true, false
        )
        "#,
        asset_id,
        vehicle_details
    )
    .execute(&pool)
    .await?;

    println!("Successfully inserted dummy vehicle with ID: {}", asset_id);
    println!("STNK Expiry: {} (In 5 days)", stnk_expiry.date_naive());
    println!("Tax Expiry: {} (In 25 days)", tax_expiry.date_naive());

    Ok(())
}
