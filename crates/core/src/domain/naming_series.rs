//! Document Naming Series Value Objects (QKRN-010 & QARC-005)
//!
//! Pure domain definitions for document numbering series.
//! Persistence operations reside in `infrastructure::repositories::NamingSeriesService`.

use serde::{Deserialize, Serialize};

/// Value object representing a naming series configuration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NamingSeriesConfig {
    pub entity_type: String,
    pub prefix: String,
    pub format: String,
}

impl NamingSeriesConfig {
    pub fn new(entity_type: impl Into<String>, prefix: impl Into<String>) -> Self {
        let prefix_str = prefix.into();
        Self {
            entity_type: entity_type.into(),
            format: format!("{prefix_str}-{{year}}-{{counter:05}}"),
            prefix: prefix_str,
        }
    }
}
