use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct FileStorage {
    base_path: PathBuf,
}

impl FileStorage {
    pub fn new(base_path: &str) -> Self {
        Self {
            base_path: PathBuf::from(base_path),
        }
    }

    /// Save a file and return the relative path
    pub async fn save_file(
        &self,
        file_data: Vec<u8>,
        original_filename: &str,
        subfolder: &str,
    ) -> DomainResult<String> {
        // Create subfolder path
        let folder_path = self.base_path.join(subfolder);
        fs::create_dir_all(&folder_path)
            .await
            .map_err(|e| DomainError::Storage {
                message: format!("Failed to create directory: {}", e),
            })?;

        // Generate unique filename
        let extension = Path::new(original_filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        let unique_name = format!("{}_{}.{}", Uuid::new_v4(), original_filename, extension);
        let file_path = folder_path.join(&unique_name);

        // Write file
        let mut file = fs::File::create(&file_path)
            .await
            .map_err(|e| DomainError::Storage {
                message: format!("Failed to create file: {}", e),
            })?;

        file.write_all(&file_data)
            .await
            .map_err(|e| DomainError::Storage {
                message: format!("Failed to write file: {}", e),
            })?;

        // Return relative path
        let relative_path = format!("{}/{}", subfolder, unique_name);
        Ok(relative_path)
    }

    /// Read a file
    pub async fn read_file(&self, relative_path: &str) -> DomainResult<Vec<u8>> {
        let file_path = self.base_path.join(relative_path);

        fs::read(&file_path)
            .await
            .map_err(|e| DomainError::Storage {
                message: format!("Failed to read file: {}", e),
            })
    }

    /// Delete a file
    pub async fn delete_file(&self, relative_path: &str) -> DomainResult<()> {
        let file_path = self.base_path.join(relative_path);

        fs::remove_file(&file_path)
            .await
            .map_err(|e| DomainError::Storage {
                message: format!("Failed to delete file: {}", e),
            })
    }

    /// Get absolute path for a relative path
    pub fn get_absolute_path(&self, relative_path: &str) -> PathBuf {
        self.base_path.join(relative_path)
    }
}
