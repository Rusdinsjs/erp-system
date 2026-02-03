use axum::{
    extract::{Multipart, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use std::path::Path;
use tokio::fs;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::shared::{AppError, AppResult};

const MAX_UPLOAD_SIZE: u64 = 10 * 1024 * 1024; // 10MB

/// Upload a file
pub async fn upload_file(
    State(_state): State<AppState>, // Not currently used, but good for future expansion
    mut multipart: Multipart,
) -> AppResult<impl IntoResponse> {
    tracing::info!(">>> [API] Incoming file upload request...");
    let mut uploaded_file = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" {
            let file_name = field.file_name().unwrap_or("unknown").to_string();
            let content_type = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if data.len() as u64 > MAX_UPLOAD_SIZE {
                return Err(AppError::BadRequest("File too large".to_string()));
            }

            // Determine extension
            let ext = Path::new(&file_name)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("bin")
                .to_lowercase();

            // Compress if image
            let (final_data, final_ext) = if ["jpg", "jpeg", "png", "webp"].contains(&ext.as_str())
            {
                let data_clone = data.clone();
                let ext_clone = ext.clone();

                let result = tokio::task::spawn_blocking(move || {
                    // Try to load image
                    match image::load_from_memory(&data_clone) {
                        Ok(img) => {
                            // Resize if larger than 1280px
                            let resized = if img.width() > 1280 || img.height() > 1280 {
                                img.resize(1280, 1280, image::imageops::FilterType::Lanczos3)
                            } else {
                                img
                            };

                            // Encode as WebP (Lossy quality 80)
                            let mut comp_bytes: Vec<u8> = Vec::new();
                            let mut cursor = std::io::Cursor::new(&mut comp_bytes);
                            match resized.write_to(&mut cursor, image::ImageFormat::WebP) {
                                Ok(_) => (comp_bytes.into(), "webp".to_string()),
                                Err(_) => (data_clone, ext_clone), // Fallback to original
                            }
                        }
                        Err(_) => (data_clone, ext_clone), // Fallback if load fails
                    }
                })
                .await
                .map_err(|e| AppError::Internal(format!("Blocking task failed: {}", e)))?;

                result
            } else {
                (data.clone(), ext)
            };

            // Generate path: uploads/YYYY/MM/DD/uuid.ext
            let now = Utc::now();
            let relative_dir = format!(
                "uploads/{}/{:02}/{:02}",
                now.format("%Y"),
                now.format("%m"),
                now.format("%d")
            );

            // Generate unique ID
            let file_id = Uuid::new_v4();
            let new_filename = format!("{}.{}", file_id, final_ext);
            let file_path = format!("{}/{}", relative_dir, new_filename);

            // Ensure directory exists
            fs::create_dir_all(&relative_dir)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to create directory: {}", e)))?;

            // Save file
            fs::write(&file_path, &final_data)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to save file: {}", e)))?;

            // URL for frontend (relative to base URL)
            // Note: `api/uploads` is served statically in server.rs
            // The ServeDir mounts "uploads" directory to "/api/uploads"
            // So if file is at "uploads/2024/01/01/file.jpg", URL is "/api/uploads/2024/01/01/file.jpg"
            let url = format!("/api/{}", file_path);

            uploaded_file = Some(json!({
                "id": file_id,
                "url": url,
                "original_name": file_name,
                "content_type": content_type,
                "size": final_data.len()
            }));

            // Only process the first file field
            break;
        }
    }

    if let Some(file_info) = uploaded_file {
        Ok(Json(file_info))
    } else {
        Err(AppError::BadRequest("No file field found".to_string()))
    }
}
