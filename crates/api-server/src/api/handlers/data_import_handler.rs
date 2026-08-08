use axum::{
    extract::{Path, State},
    http::header,
    response::{IntoResponse, Response},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::domain::entities::{DataImport, DataImportLog, UserClaims};
use management_system_core::shared::{AppError, AppResult};

#[derive(Debug, Deserialize)]
pub struct GenerateTemplateRequest {
    pub doctype_name: String,
    pub import_type: Option<String>, // 'Insert' or 'Update'
    pub selected_fields: Option<Vec<String>>,
    pub category_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateImportRequest {
    pub doctype_name: String,
    pub import_type: String,
    pub file_name: String,
    pub rows: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct DataImportDetailResponse {
    pub import_record: DataImport,
    pub logs: Vec<DataImportLog>,
}

/// GET /api/data-imports - List Import Records
pub async fn list_data_imports(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let imports = sqlx::query_as::<_, DataImport>(
        "SELECT * FROM data_imports ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(imports))
}

/// GET /api/data-imports/:id - Get Detail & Logs
pub async fn get_data_import_detail(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let import_record = sqlx::query_as::<_, DataImport>(
        "SELECT * FROM data_imports WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or(AppError::NotFound("Record Data Import tidak ditemukan".to_string()))?;

    let logs = sqlx::query_as::<_, DataImportLog>(
        "SELECT * FROM data_import_logs WHERE data_import_id = $1 ORDER BY row_number ASC"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(DataImportDetailResponse {
        import_record,
        logs,
    }))
}

/// POST /api/data-imports/template - Generate Frappe-Style CSV Template with ALL Fields
pub async fn generate_template(
    State(state): State<AppState>,
    Json(payload): Json<GenerateTemplateRequest>,
) -> AppResult<Response> {
    let import_type = payload.import_type.unwrap_or_else(|| "Insert".to_string());
    let is_update = import_type.to_lowercase() == "update";

    let mut headers: Vec<String> = vec![
        // Mandatories
        "kode_aset*", "nama_aset*", "kategori*",
        // Location & Org
        "lokasi", "departemen", "perusahaan", "penanggung_jawab", "vendor",
        // Status & Classification
        "status", "klasifikasi_aset", "apakah_disewakan", "apakah_bahan_bakar", "apakah_pinjaman",
        // Physical Details
        "merek", "model", "nomor_seri", "tahun_pembuatan", "deskripsi", "metode_pengadaan", "sumber_pendanaan",
        // Financial & Accounting
        "tanggal_pembelian", "harga_beli", "mata_uang", "jumlah_kuantitas", "nilai_residu", "masa_manfaat_bulan",
        // Disposition / Sales
        "harga_jual", "tanggal_jual", "pembeli",
        // Notes
        "catatan"
    ].into_iter().map(String::from).collect();

    let mut category_code = "ASSET".to_string();
    let mut category_name = "Kategori Umum".to_string();

    if payload.doctype_name.eq_ignore_ascii_case("asset") {
        if let Some(cat_id) = payload.category_id {
            // Fetch Category
            let category = sqlx::query!(
                "SELECT code, name, attributes FROM categories WHERE id = $1",
                cat_id
            )
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

            if let Some(cat) = category {
                category_code = cat.code.clone();
                category_name = cat.name.clone();
                let cat_code_upper = cat.code.to_uppercase();

                // Add Polymorphic Hardcoded fields based on top level code
                if cat_code_upper == "VEHICLE" {
                    let vehicle_fields = vec![
                        "spec_no_plat", "spec_no_rangka", "spec_no_mesin", "spec_stnk_expiry", "spec_pajak_expiry",
                        "spec_kir_expiry", "spec_bahan_bakar", "spec_kilometer_awal"
                    ];
                    headers.extend(vehicle_fields.into_iter().map(String::from));
                } else if cat_code_upper == "LAND" {
                    let land_fields = vec![
                        "spec_luas_tanah_m2", "spec_no_sertifikat", "spec_status_hak_tanah"
                    ];
                    headers.extend(land_fields.into_iter().map(String::from));
                } else if cat_code_upper == "BUILDING" {
                    let building_fields = vec![
                        "spec_luas_bangunan_m2", "spec_no_imb", "spec_jumlah_lantai"
                    ];
                    headers.extend(building_fields.into_iter().map(String::from));
                } else if cat_code_upper == "HEAVY_EQ" {
                    let heavy_fields = vec![
                        "spec_no_invoice", "spec_kapasitas_tonase", "spec_jam_kerja_awal", "spec_bahan_bakar"
                    ];
                    headers.extend(heavy_fields.into_iter().map(String::from));
                }

                // Add JSON Dynamic Template Attributes
                if let Some(attr_schema) = cat.attributes {
                    if let Some(arr) = attr_schema.as_array() {
                        for attr in arr {
                            if let Some(attr_name) = attr.as_str() {
                                let spec_header = format!("spec_{}", attr_name);
                                if !headers.contains(&spec_header) {
                                    headers.push(spec_header);
                                }
                            } else if let Some(obj) = attr.as_object() {
                                if let Some(attr_name) = obj.get("name").and_then(|n| n.as_str()) {
                                    let spec_header = format!("spec_{}", attr_name);
                                    if !headers.contains(&spec_header) {
                                        headers.push(spec_header);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if is_update {
        // ID_Aset_Lama is mandatory for Update mode
        headers.insert(0, "ID_Aset_Lama*".to_string());
    }

    if let Some(extra) = &payload.selected_fields {
        for f in extra {
            if !headers.contains(f) {
                headers.push(f.clone());
            }
        }
    }

    // Build sample row based on the dynamic headers
    let mut sample_row = Vec::new();
    for header in &headers {
        let val = match header.as_str() {
            "ID_Aset_Lama*" => "AST-101",
            "kode_aset*" => "AST-101",
            "nama_aset*" => "Aset Contoh",
            "kategori*" => &category_name,
            "lokasi" => "Gudang Utama",
            "status" => "in_inventory",
            "harga_beli" => "1000000",
            "jumlah_kuantitas" => "1",
            "mata_uang" => "IDR",
            "tanggal_pembelian" => "2023-01-15",
            _ => {
                if header.starts_with("spec_") {
                    "Isi Spesifikasi"
                } else {
                    ""
                }
            }
        };
        sample_row.push(val.to_string());
    }

    let csv_content = format!("{}\n{}", headers.join(","), sample_row.join(","));

    let filename = format!(
        "template_{}_{}.csv",
        payload.doctype_name.to_lowercase(),
        import_type.to_lowercase()
    );

    Ok((
        [
            (header::CONTENT_TYPE, "text/csv; charset=utf-8"),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        csv_content,
    )
        .into_response())
}

/// POST /api/data-imports/upload - Upload & Create Import Staging Log
pub async fn upload_data_import(
    Extension(claims): Extension<UserClaims>,
    State(state): State<AppState>,
    Json(payload): Json<CreateImportRequest>,
) -> AppResult<impl IntoResponse> {
    let total_rows = payload.rows.length_or_zero();

    let mut tx = state
        .pool
        .begin()
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let import_rec = sqlx::query_as::<_, DataImport>(
        r#"
        INSERT INTO data_imports (
            doctype_name, import_type, file_name, status, total_rows, created_by_user_id
        ) VALUES ($1, $2, $3, 'Pending', $4, $5)
        RETURNING *
        "#
    )
    .bind(&payload.doctype_name)
    .bind(&payload.import_type)
    .bind(&payload.file_name)
    .bind(total_rows as i32)
    .bind(claims.user_id())
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    for (idx, row) in payload.rows.into_iter().enumerate() {
        let row_num = (idx + 1) as i32;
        let identifier = row.get("kode_aset")
            .or_else(|| row.get("asset_code"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        sqlx::query(
            r#"
            INSERT INTO data_import_logs (
                data_import_id, row_number, status, record_identifier, messages, row_data
            ) VALUES ($1, $2, 'Pending', $3, '[]'::jsonb, $4)
            "#
        )
        .bind(import_rec.id)
        .bind(row_num)
        .bind(identifier)
        .bind(row)
        .execute(&mut *tx)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    }

    tx.commit()
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(import_rec))
}

/// POST /api/data-imports/:id/validate - Execute Dry-Run Validation
pub async fn validate_data_import(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let logs = sqlx::query_as::<_, DataImportLog>(
        "SELECT * FROM data_import_logs WHERE data_import_id = $1 ORDER BY row_number"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let categories = sqlx::query_scalar::<_, String>("SELECT code FROM categories")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let category_names = sqlx::query_scalar::<_, String>("SELECT name FROM categories")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let locations = sqlx::query_scalar::<_, String>("SELECT name FROM locations")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let mut failed_count = 0;
    let mut success_count = 0;

    for log in logs {
        let mut errors: Vec<String> = Vec::new();
        let data = &log.row_data;

        let code = data.get("kode_aset").or_else(|| data.get("asset_code")).and_then(|v| v.as_str());
        let name = data.get("nama_aset").or_else(|| data.get("name")).and_then(|v| v.as_str());
        let cat = data.get("kategori").or_else(|| data.get("category")).and_then(|v| v.as_str());
        let loc = data.get("lokasi").or_else(|| data.get("location")).and_then(|v| v.as_str());

        if code.unwrap_or("").trim().is_empty() {
            errors.push("Kolom 'kode_aset' wajib diisi".to_string());
        }
        if name.unwrap_or("").trim().is_empty() {
            errors.push("Kolom 'nama_aset' wajib diisi".to_string());
        }
        if let Some(c) = cat {
            let clean_cat = c.trim();
            if !categories.iter().any(|existing| existing.eq_ignore_ascii_case(clean_cat)) &&
               !category_names.iter().any(|existing| existing.eq_ignore_ascii_case(clean_cat)) {
                errors.push(format!("Kategori '{}' tidak ditemukan di database", c));
            }
        }
        if let Some(l) = loc {
            let clean_loc = l.trim();
            if !clean_loc.is_empty() && !locations.iter().any(|existing| existing.eq_ignore_ascii_case(clean_loc)) {
                errors.push(format!("Lokasi '{}' tidak ditemukan di database", l));
            }
        }

        let status = if errors.is_empty() {
            success_count += 1;
            "Success"
        } else {
            failed_count += 1;
            "Failed"
        };

        sqlx::query(
            "UPDATE data_import_logs SET status = $1, messages = $2 WHERE id = $3"
        )
        .bind(status)
        .bind(serde_json::to_value(&errors).unwrap())
        .bind(log.id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    }

    let overall_status = if failed_count == 0 {
        "Validating"
    } else if success_count == 0 {
        "Failed"
    } else {
        "Partial_Failed"
    };

    let updated_import = sqlx::query_as::<_, DataImport>(
        r#"
        UPDATE data_imports SET
            status = $1,
            successful_rows = $2,
            failed_rows = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
        "#
    )
    .bind(overall_status)
    .bind(success_count)
    .bind(failed_count)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(updated_import))
}

/// POST /api/data-imports/:id/start - Execute Actual Import (Insert / Update)
pub async fn start_data_import(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    let import_rec = sqlx::query_as::<_, DataImport>(
        "SELECT * FROM data_imports WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?
    .ok_or(AppError::NotFound("Import record not found".to_string()))?;

    let valid_logs = sqlx::query_as::<_, DataImportLog>(
        "SELECT * FROM data_import_logs WHERE data_import_id = $1 AND status = 'Success'"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let is_update = import_rec.import_type.eq_ignore_ascii_case("update");
    let mut imported_count = 0;

    for log in valid_logs {
        let d = &log.row_data;
        let old_code = d.get("ID_Aset_Lama").or_else(|| d.get("id_aset_lama")).and_then(|v| v.as_str());
        let code = d.get("kode_aset").or_else(|| d.get("asset_code")).and_then(|v| v.as_str()).unwrap_or("");
        let target_code = if is_update && old_code.is_some() { old_code.unwrap() } else { code };

        let name = d.get("nama_aset").or_else(|| d.get("name")).and_then(|v| v.as_str()).unwrap_or("");
        let cat_str = d.get("kategori").or_else(|| d.get("category")).and_then(|v| v.as_str()).unwrap_or("");
        let loc_str = d.get("lokasi").or_else(|| d.get("location")).and_then(|v| v.as_str());
        let brand = d.get("merek").or_else(|| d.get("brand")).and_then(|v| v.as_str());
        let model = d.get("model").and_then(|v| v.as_str());
        let serial = d.get("nomor_seri").or_else(|| d.get("serial_number")).and_then(|v| v.as_str());
        let price = d.get("harga_beli").or_else(|| d.get("purchase_price")).and_then(|v| v.as_str()).and_then(|s| s.parse::<f64>().ok());
        let status_val = d.get("status").and_then(|v| v.as_str()).unwrap_or("in_inventory");

        // Resolve Category ID
        let category_id = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM categories WHERE LOWER(code) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1"
        )
        .bind(cat_str)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

        // Resolve Location ID
        let location_id = if let Some(l) = loc_str {
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM locations WHERE LOWER(name) = LOWER($1) LIMIT 1"
            )
            .bind(l)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None)
        } else {
            None
        };

        // Extract specifications (all keys starting with spec_)
        let mut specifications = serde_json::Map::new();
        if let Some(obj) = d.as_object() {
            for (k, v) in obj {
                if k.starts_with("spec_") && !v.is_null() {
                    let clean_k = k.replace("spec_", "");
                    specifications.insert(clean_k, v.clone());
                }
            }
        }
        let specs_json = serde_json::Value::Object(specifications);

        if is_update {
            let res = sqlx::query(
                r#"
                UPDATE assets SET
                    asset_code = $1,
                    name = $2,
                    category_id = COALESCE($3, category_id),
                    location_id = COALESCE($4, location_id),
                    brand = COALESCE($5, brand),
                    model = COALESCE($6, model),
                    serial_number = COALESCE($7, serial_number),
                    purchase_price = COALESCE($8, purchase_price),
                    status = COALESCE($9, status),
                    specifications = COALESCE($10, specifications),
                    updated_at = NOW()
                WHERE asset_code = $11
                "#
            )
            .bind(code)
            .bind(name)
            .bind(category_id)
            .bind(location_id)
            .bind(brand)
            .bind(model)
            .bind(serial)
            .bind(price)
            .bind(status_val)
            .bind(specs_json)
            .bind(target_code)
            .execute(&state.pool)
            .await;

            if res.is_ok() { imported_count += 1; }
        } else if let Some(cat_id) = category_id {
            let res = sqlx::query(
                r#"
                INSERT INTO assets (
                    asset_code, name, category_id, location_id, brand, model, serial_number, purchase_price, status, specifications
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (asset_code) DO NOTHING
                "#
            )
            .bind(code)
            .bind(name)
            .bind(cat_id)
            .bind(location_id)
            .bind(brand)
            .bind(model)
            .bind(serial)
            .bind(price)
            .bind(status_val)
            .bind(specs_json)
            .execute(&state.pool)
            .await;

            if res.is_ok() { imported_count += 1; }
        }
    }

    let final_status = if imported_count == import_rec.total_rows {
        "Success"
    } else {
        "Partial_Failed"
    };

    let updated = sqlx::query_as::<_, DataImport>(
        r#"
        UPDATE data_imports SET status = $1, successful_rows = $2, updated_at = NOW()
        WHERE id = $3 RETURNING *
        "#
    )
    .bind(final_status)
    .bind(imported_count)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(updated))
}

/// GET /api/data-imports/:id/failed-rows - Download Failed Rows CSV
pub async fn download_failed_rows(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Response> {
    let failed_logs = sqlx::query_as::<_, DataImportLog>(
        "SELECT * FROM data_import_logs WHERE data_import_id = $1 AND status = 'Failed' ORDER BY row_number"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::Database(e.to_string()))?;

    let mut lines = vec!["No_Baris,Kode_Aset,Nama_Aset,Alasan_Error".to_string()];

    for log in failed_logs {
        let d = &log.row_data;
        let code = d.get("kode_aset").or_else(|| d.get("asset_code")).and_then(|v| v.as_str()).unwrap_or("");
        let name = d.get("nama_aset").or_else(|| d.get("name")).and_then(|v| v.as_str()).unwrap_or("");
        let errs: Vec<String> = serde_json::from_value(log.messages.clone()).unwrap_or_default();
        let err_str = errs.join(" | ").replace(",", ";");

        lines.push(format!("{},{},{},\"{}\"", log.row_number, code, name, err_str));
    }

    let csv_content = lines.join("\n");
    let filename = format!("failed_rows_import_{}.csv", id);

    Ok((
        [
            (header::CONTENT_TYPE, "text/csv; charset=utf-8"),
            (
                header::CONTENT_DISPOSITION,
                &format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        csv_content,
    )
        .into_response())
}

#[derive(serde::Deserialize)]
pub struct UpdateLogRequest {
    pub row_data: serde_json::Value,
}

/// PUT /api/data-imports/:id/logs/:log_id
pub async fn update_data_import_log(
    State(state): State<AppState>,
    Path((import_id, log_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateLogRequest>,
) -> AppResult<impl IntoResponse> {
    sqlx::query("UPDATE data_import_logs SET row_data = $1 WHERE id = $2 AND data_import_id = $3")
        .bind(&payload.row_data)
        .bind(log_id)
        .bind(import_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({"success": true})))
}

/// DELETE /api/data-imports/:id/logs/:log_id
pub async fn delete_data_import_log(
    State(state): State<AppState>,
    Path((import_id, log_id)): Path<(Uuid, Uuid)>,
) -> AppResult<impl IntoResponse> {
    sqlx::query("DELETE FROM data_import_logs WHERE id = $1 AND data_import_id = $2")
        .bind(log_id)
        .bind(import_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
        
    // Update total_rows in parent
    sqlx::query("UPDATE data_imports SET total_rows = (SELECT COUNT(*) FROM data_import_logs WHERE data_import_id = $1) WHERE id = $1")
        .bind(import_id)
        .execute(&state.pool)
        .await
        .ok();

    Ok(Json(json!({"success": true})))
}

#[derive(serde::Deserialize)]
pub struct MapColumnsRequest {
    pub mappings: std::collections::HashMap<String, String>,
}

/// PUT /api/data-imports/:id/map-columns
pub async fn map_data_import_columns(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<MapColumnsRequest>,
) -> AppResult<impl IntoResponse> {
    for (old_key, new_key) in payload.mappings {
        sqlx::query(
            r#"
            UPDATE data_import_logs 
            SET row_data = (row_data - $1) || jsonb_build_object($2::text, row_data->($1::text))
            WHERE data_import_id = $3 AND row_data ? $1
            "#
        )
        .bind(&old_key)
        .bind(&new_key)
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;
    }
    Ok(Json(json!({"success": true})))
}

trait VecLenExt {
    fn length_or_zero(&self) -> usize;
}

impl VecLenExt for Vec<serde_json::Value> {
    fn length_or_zero(&self) -> usize {
        self.len()
    }
}
