#[tokio::test]
async fn debug_fuel_history() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::PgPool::connect(&database_url).await?;

    let request_id = uuid::Uuid::parse_str("da5fcea6-0be1-4d3a-8645-1644bf76aabb")?;

    // 1. Get the request
    let request = sqlx::query!("SELECT * FROM fuel_logs WHERE id = $1", request_id)
        .fetch_optional(&pool)
        .await?;

    if let Some(req) = request {
        println!("Request Found: {:?}", req);
        let asset_id = req.asset_id;

        // 2. Get all logs for this asset
        let logs = sqlx::query!(
            "SELECT * FROM fuel_logs WHERE asset_id = $1 ORDER BY created_at DESC",
            asset_id
        )
        .fetch_all(&pool)
        .await?;

        println!("--- Fuel History for Asset {} ---", asset_id);
        for log in logs {
            println!(
                "ID: {}, Status: {:?}, Created: {:?}, Odo: {:?}, ActualVolume: {:?}",
                log.id, log.status, log.created_at, log.odometer_reading, log.actual_volume
            );
        }
    } else {
        println!("Request {} not found!", request_id);
    }

    Ok(())
}
