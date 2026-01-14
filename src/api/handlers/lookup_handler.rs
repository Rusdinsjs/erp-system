//! Lookup Handler - Static data

use axum::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct LookupItem {
    pub id: i32,
    pub code: String,
    pub name: String,
}

pub async fn list_currencies() -> Json<Vec<LookupItem>> {
    Json(vec![
        LookupItem {
            id: 1,
            code: "IDR".to_string(),
            name: "Rupiah Indonesia".to_string(),
        },
        LookupItem {
            id: 2,
            code: "USD".to_string(),
            name: "US Dollar".to_string(),
        },
        LookupItem {
            id: 3,
            code: "EUR".to_string(),
            name: "Euro".to_string(),
        },
    ])
}

pub async fn list_units() -> Json<Vec<LookupItem>> {
    Json(vec![
        LookupItem {
            id: 1,
            code: "UNIT".to_string(),
            name: "Unit".to_string(),
        },
        LookupItem {
            id: 2,
            code: "SET".to_string(),
            name: "Set".to_string(),
        },
        LookupItem {
            id: 3,
            code: "PCS".to_string(),
            name: "Pieces".to_string(),
        },
    ])
}

pub async fn list_conditions() -> Json<Vec<LookupItem>> {
    Json(vec![
        LookupItem {
            id: 1,
            code: "NEW".to_string(),
            name: "Baru".to_string(),
        },
        LookupItem {
            id: 2,
            code: "GOOD".to_string(),
            name: "Baik".to_string(),
        },
        LookupItem {
            id: 3,
            code: "FAIR".to_string(),
            name: "Cukup".to_string(),
        },
        LookupItem {
            id: 4,
            code: "POOR".to_string(),
            name: "Buruk".to_string(),
        },
        LookupItem {
            id: 5,
            code: "BROKEN".to_string(),
            name: "Rusak".to_string(),
        },
    ])
}

pub async fn list_maintenance_types() -> Json<Vec<LookupItem>> {
    Json(vec![
        LookupItem {
            id: 1,
            code: "ROUTINE".to_string(),
            name: "Pemeliharaan Rutin".to_string(),
        },
        LookupItem {
            id: 2,
            code: "REPAIR".to_string(),
            name: "Perbaikan".to_string(),
        },
        LookupItem {
            id: 3,
            code: "OVERHAUL".to_string(),
            name: "Overhaul".to_string(),
        },
        LookupItem {
            id: 4,
            code: "INSPECTION".to_string(),
            name: "Inspeksi".to_string(),
        },
    ])
}
