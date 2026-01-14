//! Category Service
//!
//! Handles category operations including hierarchical tree structure.

use uuid::Uuid;

use crate::application::dto::{
    CategoryClassification, CategoryResponse, CategoryTreeNode, CreateCategoryRequest,
    SubCategoryItem, UpdateCategoryRequest,
};
use crate::domain::entities::Category;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::CategoryRepository;

/// Category service for managing asset categories
#[derive(Clone)]
pub struct CategoryService {
    repository: CategoryRepository,
}

impl CategoryService {
    pub fn new(repository: CategoryRepository) -> Self {
        Self { repository }
    }

    /// Get all categories as a flat list
    pub async fn list_all(&self, department: Option<&str>) -> DomainResult<Vec<CategoryResponse>> {
        let categories = self.repository.list(department).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(categories.into_iter().map(Self::to_response).collect())
    }

    /// Get category by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<CategoryResponse> {
        let category = self.repository.find_by_id(id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        match category {
            Some(c) => Ok(Self::to_response(c)),
            None => Err(DomainError::NotFound {
                entity: "Category".to_string(),
                id: id.to_string(),
            }),
        }
    }

    /// Get categories as a hierarchical tree
    pub async fn get_tree(&self, department: Option<&str>) -> DomainResult<Vec<CategoryTreeNode>> {
        let categories = self.repository.list(department).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Build tree structure
        let root_categories: Vec<_> = categories
            .iter()
            .filter(|c| c.parent_id.is_none())
            .collect();

        let mut tree: Vec<CategoryTreeNode> = Vec::new();
        for root in root_categories {
            let node = self.build_tree_node(root, &categories, 0);
            tree.push(node);
        }

        // Sort by display_order
        tree.sort_by(|a, b| a.display_order.cmp(&b.display_order));

        Ok(tree)
    }

    /// Get categories grouped by main category (classification view)
    pub async fn get_classification(
        &self,
        department: Option<&str>,
    ) -> DomainResult<Vec<CategoryClassification>> {
        let categories = self.repository.list(department).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        // Get main categories (root level)
        let mut main_categories: Vec<_> = categories
            .iter()
            .filter(|c| c.parent_id.is_none() && c.main_category.is_some())
            .collect();

        main_categories.sort_by(|a, b| a.display_order.cmp(&b.display_order));

        let mut result: Vec<CategoryClassification> = Vec::new();

        for main in main_categories {
            // Get sub-categories for this main category
            let mut sub_cats: Vec<_> = categories
                .iter()
                .filter(|c| c.parent_id == Some(main.id))
                .collect();

            sub_cats.sort_by(|a, b| a.display_order.cmp(&b.display_order));

            let sub_category_items: Vec<SubCategoryItem> = sub_cats
                .into_iter()
                .map(|sc| {
                    let example_assets: Vec<String> = sc
                        .example_assets
                        .as_ref()
                        .and_then(|v| serde_json::from_value(v.clone()).ok())
                        .unwrap_or_default();

                    SubCategoryItem {
                        id: sc.id,
                        letter: sc.sub_category_letter.clone().unwrap_or_default(),
                        name: sc.name.clone(),
                        description: sc.description.clone(),
                        function_description: sc.function_description.clone(),
                        example_assets,
                    }
                })
                .collect();

            result.push(CategoryClassification {
                main_category: main.main_category.clone().unwrap_or_default(),
                description: main.description.clone().unwrap_or_default(),
                function_description: main.function_description.clone().unwrap_or_default(),
                sub_categories: sub_category_items,
            });
        }

        Ok(result)
    }

    /// Create a new category
    pub async fn create(&self, request: CreateCategoryRequest) -> DomainResult<CategoryResponse> {
        let mut category = Category::new(request.code.clone(), request.name.clone());

        category.parent_id = request.parent_id;
        category.department = request.department;
        category.description = request.description;
        category.main_category = request.main_category;
        category.sub_category_letter = request.sub_category_letter;
        category.function_description = request.function_description;
        category.display_order = request.display_order.unwrap_or(0);

        if let Some(assets) = request.example_assets {
            category.example_assets = Some(serde_json::to_value(assets).unwrap_or_default());
        }

        let created = self.repository.create(&category).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(Self::to_response(created))
    }

    /// Update a category
    pub async fn update(
        &self,
        id: Uuid,
        request: UpdateCategoryRequest,
    ) -> DomainResult<CategoryResponse> {
        let existing = self.repository.find_by_id(id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        let mut category = match existing {
            Some(c) => c,
            None => {
                return Err(DomainError::NotFound {
                    entity: "Category".to_string(),
                    id: id.to_string(),
                })
            }
        };

        if let Some(code) = request.code {
            category.code = code;
        }
        if let Some(name) = request.name {
            category.name = name;
        }
        if let Some(parent_id) = request.parent_id {
            category.parent_id = Some(parent_id);
        }
        if let Some(dept) = request.department {
            category.department = Some(dept);
        }
        if let Some(description) = request.description {
            category.description = Some(description);
        }
        if let Some(main_category) = request.main_category {
            category.main_category = Some(main_category);
        }
        if let Some(sub_category_letter) = request.sub_category_letter {
            category.sub_category_letter = Some(sub_category_letter);
        }
        if let Some(function_description) = request.function_description {
            category.function_description = Some(function_description);
        }
        if let Some(display_order) = request.display_order {
            category.display_order = display_order;
        }
        if let Some(assets) = request.example_assets {
            category.example_assets = Some(serde_json::to_value(assets).unwrap_or_default());
        }

        let updated = self.repository.update(&category).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        Ok(Self::to_response(updated))
    }

    /// Delete a category
    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Build tree node recursively
    fn build_tree_node(
        &self,
        category: &Category,
        all_categories: &[Category],
        level: u32,
    ) -> CategoryTreeNode {
        let mut children: Vec<CategoryTreeNode> = all_categories
            .iter()
            .filter(|c| c.parent_id == Some(category.id))
            .map(|c| self.build_tree_node(c, all_categories, level + 1))
            .collect();

        children.sort_by(|a, b| a.display_order.cmp(&b.display_order));

        let example_assets: Option<Vec<String>> = category
            .example_assets
            .as_ref()
            .and_then(|v| serde_json::from_value(v.clone()).ok());

        CategoryTreeNode {
            id: category.id,
            code: category.code.clone(),
            name: category.name.clone(),
            department: category.department.clone(),
            description: category.description.clone(),
            main_category: category.main_category.clone(),
            sub_category_letter: category.sub_category_letter.clone(),
            function_description: category.function_description.clone(),
            example_assets,
            display_order: category.display_order,
            level,
            children,
        }
    }

    /// Convert entity to response DTO
    fn to_response(category: Category) -> CategoryResponse {
        let example_assets: Option<Vec<String>> = category
            .example_assets
            .as_ref()
            .and_then(|v| serde_json::from_value(v.clone()).ok());

        CategoryResponse {
            id: category.id,
            code: category.code,
            name: category.name,
            parent_id: category.parent_id,
            department: category.department,
            description: category.description,
            main_category: category.main_category,
            sub_category_letter: category.sub_category_letter,
            function_description: category.function_description,
            example_assets,
            display_order: category.display_order,
            created_at: category.created_at,
            updated_at: category.updated_at,
        }
    }
}
