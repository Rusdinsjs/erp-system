use axum::{
    extract::{Multipart, Path, State},
    http::{header, HeaderMap},
    response::IntoResponse,
    Extension, Json,
};
use chrono::Utc;
use serde_json::json;
use std::path::{Path as StdPath, PathBuf};
use tokio::fs;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::UserClaims;
use management_system_core::shared::{AppError, AppResult};

const MAX_UPLOAD_SIZE: u64 = 10 * 1024 * 1024; // 10MB

/// Upload a file (QSEC-006: Authenticated file upload)
pub async fn upload_file(
    Extension(claims): Extension<UserClaims>,
    State(_state): State<AppState>,
    mut multipart: Multipart,
) -> AppResult<impl IntoResponse> {
    tracing::info!(
        ">>> [API] Authenticated file upload request from user {}...",
        claims.sub
    );
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
            let ext = StdPath::new(&file_name)
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
                    match image::load_from_memory(&data_clone) {
                        Ok(img) => {
                            let resized = if img.width() > 1280 || img.height() > 1280 {
                                img.resize(1280, 1280, image::imageops::FilterType::Lanczos3)
                            } else {
                                img
                            };

                            let mut comp_bytes: Vec<u8> = Vec::new();
                            let mut cursor = std::io::Cursor::new(&mut comp_bytes);
                            match resized.write_to(&mut cursor, image::ImageFormat::WebP) {
                                Ok(_) => (comp_bytes.into(), "webp".to_string()),
                                Err(_) => (data_clone, ext_clone),
                            }
                        }
                        Err(_) => (data_clone, ext_clone),
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

            let file_id = Uuid::new_v4();
            let new_filename = format!("{}.{}", file_id, final_ext);
            let file_path = format!("{}/{}", relative_dir, new_filename);

            fs::create_dir_all(&relative_dir)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to create directory: {}", e)))?;

            fs::write(&file_path, &final_data)
                .await
                .map_err(|e| AppError::Internal(format!("Failed to save file: {}", e)))?;

            let url = format!("/api/{}", file_path);

            uploaded_file = Some(json!({
                "id": file_id,
                "url": url,
                "original_name": file_name,
                "content_type": content_type,
                "size": final_data.len(),
                "uploaded_by": claims.user_id()
            }));

            break;
        }
    }

    if let Some(file_info) = uploaded_file {
        Ok(Json(file_info))
    } else {
        Err(AppError::BadRequest("No file field found".to_string()))
    }
}

/// Private file download service (QSEC-006: Authenticated file access)
pub async fn get_private_file(
    Extension(claims): Extension<UserClaims>,
    Path(file_path): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    tracing::info!(
        "Private file fetch requested by user {} for path: {}",
        claims.sub,
        file_path
    );

    // Prevent directory traversal attacks
    let safe_path = file_path.trim_start_matches('/');
    if safe_path.contains("..") || safe_path.contains("\\") {
        return Err(AppError::BadRequest("Invalid file path".to_string()));
    }

    let full_path = PathBuf::from("uploads").join(safe_path);

    if !full_path.exists() || !full_path.is_file() {
        return Err(AppError::NotFound("File not found".to_string()));
    }

    let contents = fs::read(&full_path)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to read file: {}", e)))?;

    let mime_type = mime_guess::from_path(&full_path)
        .first_or_octet_stream()
        .to_string();

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, mime_type.parse().unwrap());
    headers.insert(
        header::CACHE_CONTROL,
        "private, max-age=3600".parse().unwrap(),
    );

    Ok((headers, contents))
}
