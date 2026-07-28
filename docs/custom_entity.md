     IMPLEMENT CUSTOM ENTITY TYPES UNTUK APPROVAL WORKFLOW                                                                                                                                       
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     LATAR BELAKANG:                                                                                                                                                                             
     Saat ini 9 entity type di Approval Workflow Settings hardcoded di:                                                                                                                          
                                                                                                                                                                                                 
     web-admin/src/config/approvalEntities.ts                                                                                                                                                    
                                                                                                                                                                                                 
     ERP akan terus bertambah menu baru (contract, purchase_order,                                                                                                                               
     expense_report, dll). Setiap menu baru butuh entity type baru.                                                                                                                              
     Hardcoded = tidak scalable, harus rebuild frontend tiap kali.                                                                                                                               
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 1: MIGRATION — TABEL approval_entity_types                                                                                                                                           
                                                                                                                                                                                                 
     File: migrations/XXX_create_approval_entity_types.sql                                                                                                                                       
                                                                                                                                                                                                 
     CREATE TABLE approval_entity_types (                                                                                                                                                        
         id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),                                                                                                                            
         value           VARCHAR(50) UNIQUE NOT NULL,   -- 'asset', 'work_order'                                                                                                                 
         label           VARCHAR(100) NOT NULL,          -- 'Asset', 'Work Order'                                                                                                                
         icon            VARCHAR(50),                    -- 'Box', 'Wrench'                                                                                                                      
         color           VARCHAR(50),                    -- 'text-green-400'                                                                                                                     
         description     TEXT,                                                                                                                                                                   
         backend_module  VARCHAR(100),                   -- 'asset_service'                                                                                                                      
         is_active       BOOLEAN DEFAULT true,                                                                                                                                                   
         is_system       BOOLEAN DEFAULT false,          -- true = bawaan, tidak bisa dihapus                                                                                                    
         created_at      TIMESTAMPTZ DEFAULT NOW(),                                                                                                                                              
         updated_at      TIMESTAMPTZ DEFAULT NOW()                                                                                                                                               
     );                                                                                                                                                                                          
                                                                                                                                                                                                 
     -- Seed default 9 entity types                                                                                                                                                              
     INSERT INTO approval_entity_types (id, value, label, icon, color, description, backend_module, is_system) VALUES                                                                            
         (gen_random_uuid(), 'asset', 'Asset', 'Box', 'text-green-400',                                                                                                                          
          'Asset creation, sale, and disposal', 'asset_service', true),                                                                                                                          
         (gen_random_uuid(), 'work_order', 'Work Order', 'Wrench', 'text-blue-400',                                                                                                              
          'Maintenance work order creation', 'work_order_service', true),                                                                                                                        
         (gen_random_uuid(), 'loan', 'Loan', 'ArrowLeftRight', 'text-cyan-400',                                                                                                                  
          'Asset loan requests', 'loan_service', true),                                                                                                                                          
         (gen_random_uuid(), 'lifecycle_transition', 'Lifecycle Transition', 'RefreshCw', 'text-violet-400',                                                                                     
          'Asset state changes (deploy, retire, etc)', 'asset_service', true),                                                                                                                   
         (gen_random_uuid(), 'rental_request', 'Rental Request', 'Truck', 'text-orange-400',                                                                                                     
          'New rental order requests', 'rental_service', true),                                                                                                                                  
         (gen_random_uuid(), 'timesheet_verification', 'Timesheet', 'ClipboardCheck', 'text-teal-400',                                                                                           
          'Timesheet verification requests', 'timesheet_service', true),                                                                                                                         
         (gen_random_uuid(), 'conversion_request', 'Conversion', 'ArrowLeftRight', 'text-purple-400',                                                                                            
          'Unit conversion requests', 'inventory_service', true),                                                                                                                                
         (gen_random_uuid(), 'fuel_request', 'Fuel Request', 'Fuel', 'text-yellow-400',                                                                                                          
          'Fuel logging requests', 'fuel_service', true),                                                                                                                                        
         (gen_random_uuid(), 'tax_renewal', 'Tax Renewal', 'FileText', 'text-rose-400',                                                                                                          
          'Tax/KIR/STNK renewal requests', 'tax_renewal_service', true);                                                                                                                         
                                                                                                                                                                                                 
     -- Add foreign key to approval_workflows                                                                                                                                                    
     ALTER TABLE approval_workflows                                                                                                                                                              
         ADD CONSTRAINT fk_approval_workflows_entity_type                                                                                                                                        
         FOREIGN KEY (entity_type) REFERENCES approval_entity_types(value);                                                                                                                      
                                                                                                                                                                                                 
     -- Index for lookups                                                                                                                                                                        
     CREATE INDEX idx_approval_entity_types_value ON approval_entity_types(value);                                                                                                               
     CREATE INDEX idx_approval_entity_types_is_active ON approval_entity_types(is_active);                                                                                                       
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 2: BACKEND — ENTITY TYPES CRUD                                                                                                                                                       
                                                                                                                                                                                                 
     2a. ENTITY — crates/core/src/domain/entities/approval_entity_type.rs                                                                                                                        
                                                                                                                                                                                                 
     use chrono::{DateTime, Utc};                                                                                                                                                                
     use serde::{Deserialize, Serialize};                                                                                                                                                        
     use sqlx::FromRow;                                                                                                                                                                          
     use uuid::Uuid;                                                                                                                                                                             
                                                                                                                                                                                                 
     #[derive(Debug, Clone, Serialize, Deserialize, FromRow)]                                                                                                                                    
     pub struct ApprovalEntityType {                                                                                                                                                             
         pub id: Uuid,                                                                                                                                                                           
         pub value: String,                                                                                                                                                                      
         pub label: String,                                                                                                                                                                      
         pub icon: Option<String>,                                                                                                                                                               
         pub color: Option<String>,                                                                                                                                                              
         pub description: Option<String>,                                                                                                                                                        
         pub backend_module: Option<String>,                                                                                                                                                     
         pub is_active: bool,                                                                                                                                                                    
         pub is_system: bool,                                                                                                                                                                    
         pub created_at: DateTime<Utc>,                                                                                                                                                          
         pub updated_at: DateTime<Utc>,                                                                                                                                                          
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     #[derive(Debug, Deserialize)]                                                                                                                                                               
     pub struct CreateEntityTypeRequest {                                                                                                                                                        
         pub value: String,                                                                                                                                                                      
         pub label: String,                                                                                                                                                                      
         pub icon: Option<String>,                                                                                                                                                               
         pub color: Option<String>,                                                                                                                                                              
         pub description: Option<String>,                                                                                                                                                        
         pub backend_module: Option<String>,                                                                                                                                                     
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     2b. REPOSITORY — crates/core/src/infrastructure/repositories/approval_entity_type_repository.rs                                                                                             
                                                                                                                                                                                                 
     pub struct ApprovalEntityTypeRepository {                                                                                                                                                   
         pool: PgPool,                                                                                                                                                                           
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     impl ApprovalEntityTypeRepository {                                                                                                                                                         
         pub async fn find_all_active(&self) -> DomainResult<Vec<ApprovalEntityType>> {                                                                                                          
             sqlx::query_as!(                                                                                                                                                                    
                 ApprovalEntityType,                                                                                                                                                             
                 r#"SELECT id, value, label, icon, color, description,                                                                                                                           
                    backend_module, is_active, is_system, created_at, updated_at                                                                                                                 
                    FROM approval_entity_types                                                                                                                                                   
                    WHERE is_active = true                                                                                                                                                       
                    ORDER BY created_at ASC"#                                                                                                                                                    
             )                                                                                                                                                                                   
             .fetch_all(&self.pool)                                                                                                                                                              
             .await                                                                                                                                                                              
             .map_err(|e| DomainError::Database(e.to_string()))                                                                                                                                  
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn find_by_value(&self, value: &str) -> DomainResult<Option<ApprovalEntityType>> {                                                                                            
             sqlx::query_as!(...)                                                                                                                                                                
             .fetch_optional(&self.pool)                                                                                                                                                         
             .await                                                                                                                                                                              
             .map_err(|e| DomainError::Database(e.to_string()))                                                                                                                                  
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn create(&self, payload: CreateEntityTypeRequest) -> DomainResult<ApprovalEntityType> {                                                                                      
             // Validasi: value hanya lowercase + underscore                                                                                                                                     
             let valid_value = payload.value.to_lowercase()                                                                                                                                      
                 .chars()                                                                                                                                                                        
                 .filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')                                                                                                           
                 .collect::<String>();                                                                                                                                                           
                                                                                                                                                                                                 
             if valid_value != payload.value.to_lowercase() {                                                                                                                                    
                 return Err(DomainError::Validation(                                                                                                                                             
                     "Entity type value must be lowercase with underscores only".into()                                                                                                          
                 ));                                                                                                                                                                             
             }                                                                                                                                                                                   
                                                                                                                                                                                                 
             // Cek duplikat                                                                                                                                                                     
             if self.find_by_value(&valid_value).await?.is_some() {                                                                                                                              
                 return Err(DomainError::Validation(                                                                                                                                             
                     format!("Entity type '{}' already exists", valid_value)                                                                                                                     
                 ));                                                                                                                                                                             
             }                                                                                                                                                                                   
                                                                                                                                                                                                 
             sqlx::query_as!(                                                                                                                                                                    
                 ApprovalEntityType,                                                                                                                                                             
                 r#"INSERT INTO approval_entity_types                                                                                                                                            
                    (id, value, label, icon, color, description, backend_module, is_system)                                                                                                      
                    VALUES ($1, $2, $3, $4, $5, $6, $7, false)                                                                                                                                   
                    RETURNING ..."#,                                                                                                                                                             
                 Uuid::new_v4(), valid_value, payload.label,                                                                                                                                     
                 payload.icon, payload.color, payload.description,                                                                                                                               
                 payload.backend_module                                                                                                                                                          
             )                                                                                                                                                                                   
             .fetch_one(&self.pool)                                                                                                                                                              
             .await                                                                                                                                                                              
             .map_err(|e| DomainError::Database(e.to_string()))                                                                                                                                  
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn update(&self, id: Uuid, payload: UpdateEntityTypeRequest) -> DomainResult<ApprovalEntityType> {                                                                            
             sqlx::query_as!(                                                                                                                                                                    
                 ApprovalEntityType,                                                                                                                                                             
                 r#"UPDATE approval_entity_types                                                                                                                                                 
                    SET label = $1, icon = $2, color = $3, description = $4,                                                                                                                     
                        backend_module = $5, updated_at = NOW()                                                                                                                                  
                    WHERE id = $6 AND is_system = false                                                                                                                                          
                    RETURNING ..."#,                                                                                                                                                             
                 payload.label, payload.icon, payload.color,                                                                                                                                     
                 payload.description, payload.backend_module, id                                                                                                                                 
             )                                                                                                                                                                                   
             .fetch_one(&self.pool)                                                                                                                                                              
             .await                                                                                                                                                                              
             .map_err(|e| DomainError::Database(e.to_string()))                                                                                                                                  
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn soft_delete(&self, id: Uuid) -> DomainResult<()> {                                                                                                                         
             // Cek apakah ada workflow yang menggunakan entity ini                                                                                                                              
             let usage_count: (i64,) = sqlx::query_as(                                                                                                                                           
                 "SELECT COUNT() FROM approval_workflows WHERE entity_type = \                                                                                                                   
                  (SELECT value FROM approval_entity_types WHERE id = $1)"                                                                                                                       
             )                                                                                                                                                                                   
             .bind(id)                                                                                                                                                                           
             .fetch_one(&self.pool)                                                                                                                                                              
             .await?;                                                                                                                                                                            
                                                                                                                                                                                                 
             if usage_count.0 > 0 {                                                                                                                                                              
                 return Err(DomainError::BusinessRule(                                                                                                                                           
                     "Cannot delete entity type that has active workflows".into()                                                                                                                
                 ));                                                                                                                                                                             
             }                                                                                                                                                                                   
                                                                                                                                                                                                 
             sqlx::query!(                                                                                                                                                                       
                 "UPDATE approval_entity_types SET is_active = false, updated_at = NOW() \                                                                                                       
                  WHERE id = $1 AND is_system = false",                                                                                                                                          
                 id                                                                                                                                                                              
             )                                                                                                                                                                                   
             .execute(&self.pool)                                                                                                                                                                
             .await                                                                                                                                                                              
             .map_err(|e| DomainError::Database(e.to_string()))?;                                                                                                                                
                                                                                                                                                                                                 
             Ok(())                                                                                                                                                                              
         }                                                                                                                                                                                       
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     2c. SERVICE — crates/core/src/application/services/approval_entity_service.rs                                                                                                               
                                                                                                                                                                                                 
     pub struct ApprovalEntityService {                                                                                                                                                          
         entity_repo: ApprovalEntityTypeRepository,                                                                                                                                              
         workflow_repo: ApprovalWorkflowRepository,                                                                                                                                              
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     impl ApprovalEntityService {                                                                                                                                                                
         pub async fn get_entity_types(&self) -> DomainResult<Vec<ApprovalEntityType>> {                                                                                                         
             self.entity_repo.find_all_active().await                                                                                                                                            
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn create_entity(&self, request: CreateEntityTypeRequest) -> DomainResult<ApprovalEntityType> {                                                                               
             self.entity_repo.create(request).await                                                                                                                                              
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn update_entity(&self, id: Uuid, request: UpdateEntityTypeRequest) -> DomainResult<ApprovalEntityType> {                                                                     
             self.entity_repo.update(id, request).await                                                                                                                                          
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn delete_entity(&self, id: Uuid) -> DomainResult<()> {                                                                                                                       
             self.entity_repo.soft_delete(id).await                                                                                                                                              
         }                                                                                                                                                                                       
                                                                                                                                                                                                 
         pub async fn validate_entity_type(&self, entity_type: &str) -> DomainResult<bool> {                                                                                                     
             Ok(self.entity_repo.find_by_value(entity_type).await?.is_some())                                                                                                                    
         }                                                                                                                                                                                       
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     2d. UPDATE approval_workflow_service.rs — TAMBAH VALIDASI:                                                                                                                                  
                                                                                                                                                                                                 
     pub async fn create_workflow(                                                                                                                                                               
         &self,                                                                                                                                                                                  
         entity_service: &ApprovalEntityService,                                                                                                                                                 
         workflow: ApprovalWorkflow,                                                                                                                                                             
     ) -> DomainResult<ApprovalWorkflow> {                                                                                                                                                       
         // Validasi entity type dari DB                                                                                                                                                         
         if !entity_service.validate_entity_type(&workflow.entity_type).await? {                                                                                                                 
             return Err(DomainError::Validation(format!(                                                                                                                                         
                 "Invalid entity type: '{}'. Must be a registered entity type.",                                                                                                                 
                 workflow.entity_type                                                                                                                                                            
             )));                                                                                                                                                                                
         }                                                                                                                                                                                       
         self.repo.create(&workflow).await                                                                                                                                                       
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 3: BACKEND — HANDLER + ROUTES                                                                                                                                                        
                                                                                                                                                                                                 
     3a. Handler — crates/api-server/src/api/handlers/approval_entity_handler.rs                                                                                                                 
                                                                                                                                                                                                 
     pub async fn list_entity_types(                                                                                                                                                             
         State(state): State<AppState>,                                                                                                                                                          
     ) -> Result<Json<ApiResponse<Vec<ApprovalEntityType>>>, AppError> {                                                                                                                         
         let types = state.approval_entity_service.get_entity_types().await?;                                                                                                                    
         Ok(Json(ApiResponse::success(types)))                                                                                                                                                   
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     pub async fn create_entity_type(                                                                                                                                                            
         State(state): State<AppState>,                                                                                                                                                          
         Extension(claims): Extension<UserClaims>,                                                                                                                                               
         Json(payload): Json<CreateEntityTypeRequest>,                                                                                                                                           
     ) -> Result<impl IntoResponse, AppError> {                                                                                                                                                  
         if claims.role_level > 2 {                                                                                                                                                              
             return Err(AppError::Forbidden("Only Admin can manage entity types"));                                                                                                              
         }                                                                                                                                                                                       
         let entity = state.approval_entity_service.create_entity(payload).await?;                                                                                                               
         Ok((StatusCode::CREATED, Json(ApiResponse::success(entity))))                                                                                                                           
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     pub async fn update_entity_type(                                                                                                                                                            
         State(state): State<AppState>,                                                                                                                                                          
         Extension(claims): Extension<UserClaims>,                                                                                                                                               
         Path(id): Path<Uuid>,                                                                                                                                                                   
         Json(payload): Json<UpdateEntityTypeRequest>,                                                                                                                                           
     ) -> Result<Json<ApiResponse<ApprovalEntityType>>, AppError> {                                                                                                                              
         if claims.role_level > 2 {                                                                                                                                                              
             return Err(AppError::Forbidden("Only Admin can manage entity types"));                                                                                                              
         }                                                                                                                                                                                       
         let entity = state.approval_entity_service.update_entity(id, payload).await?;                                                                                                           
         Ok(Json(ApiResponse::success(entity)))                                                                                                                                                  
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     pub async fn delete_entity_type(                                                                                                                                                            
         State(state): State<AppState>,                                                                                                                                                          
         Extension(claims): Extension<UserClaims>,                                                                                                                                               
         Path(id): Path<Uuid>,                                                                                                                                                                   
     ) -> Result<impl IntoResponse, AppError> {                                                                                                                                                  
         if claims.role_level > 2 {                                                                                                                                                              
             return Err(AppError::Forbidden("Only Admin can manage entity types"));                                                                                                              
         }                                                                                                                                                                                       
         state.approval_entity_service.delete_entity(id).await?;                                                                                                                                 
         Ok(StatusCode::NO_CONTENT)                                                                                                                                                              
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     3b. Routes — crates/api-server/src/api/routes/approval_routes.rs                                                                                                                            
                                                                                                                                                                                                 
     .route("/approval/entity-types", get(list_entity_types).post(create_entity_type))                                                                                                           
     .route("/approval/entity-types/:id", patch(update_entity_type).delete(delete_entity_type))                                                                                                  
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 4: FRONTEND — DYNAMIC CONFIG DARI API                                                                                                                                                
                                                                                                                                                                                                 
     4a. HAPUS file lama:                                                                                                                                                                        
         web-admin/src/config/approvalEntities.ts  ← DELETE                                                                                                                                      
                                                                                                                                                                                                 
     4b. API — web-admin/src/api/approvalEntityTypes.ts                                                                                                                                          
                                                                                                                                                                                                 
     import { api } from './http';                                                                                                                                                               
                                                                                                                                                                                                 
     export interface ApprovalEntityType {                                                                                                                                                       
         id: string;                                                                                                                                                                             
         value: string;                                                                                                                                                                          
         label: string;                                                                                                                                                                          
         icon: string | null;                                                                                                                                                                    
         color: string | null;                                                                                                                                                                   
         description: string | null;                                                                                                                                                             
         backend_module: string | null;                                                                                                                                                          
         is_active: boolean;                                                                                                                                                                     
         is_system: boolean;                                                                                                                                                                     
     }                                                                                                                                                                                           
                                                                                                                                                                                                 
     export const approvalEntityTypesApi = {                                                                                                                                                     
         list: () => api.get<ApprovalEntityType[]>('/approval/entity-types')                                                                                                                     
             .then(r => r.data?.data || r.data || []),                                                                                                                                           
                                                                                                                                                                                                 
         create: (data: { value: string; label: string; icon?: string; color?: string; description?: string; backend_module?: string }) =>                                                       
             api.post('/approval/entity-types', data).then(r => r.data?.data),                                                                                                                   
                                                                                                                                                                                                 
         update: (id: string, data: { label?: string; icon?: string; color?: string; description?: string; backend_module?: string }) =>                                                         
             api.patch(/approval/entity-types/${id}, data).then(r => r.data?.data),                                                                                                              
                                                                                                                                                                                                 
         delete: (id: string) => api.delete(/approval/entity-types/${id}),                                                                                                                       
     };                                                                                                                                                                                          
                                                                                                                                                                                                 
     4c. UPDATE ApprovalWorkflowSettings.tsx — FETCH DARI API                                                                                                                                    
                                                                                                                                                                                                 
     Ganti import:                                                                                                                                                                               
                                                                                                                                                                                                 
         // HAPUS:                                                                                                                                                                               
         // import { APPROVAL_ENTITY_TYPES } from '../config/approvalEntities';                                                                                                                  
                                                                                                                                                                                                 
         // TAMBAH:                                                                                                                                                                              
         import { approvalEntityTypesApi, type ApprovalEntityType } from '../api/approvalEntityTypes';                                                                                           
                                                                                                                                                                                                 
     Di komponen, fetch entity types dari API:                                                                                                                                                   
                                                                                                                                                                                                 
         const [entityTypes, setEntityTypes] = useState<ApprovalEntityType[]>([]);                                                                                                               
                                                                                                                                                                                                 
         useEffect(() => {                                                                                                                                                                       
             approvalEntityTypesApi.list().then(setEntityTypes).catch(console.error);                                                                                                            
         }, []);                                                                                                                                                                                 
                                                                                                                                                                                                 
     Dropdown render dari state (bukan hardcoded):                                                                                                                                               
                                                                                                                                                                                                 
         <select value={formData.entity_type} onChange={...}>                                                                                                                                    
             {entityTypes.map(ent => (                                                                                                                                                           
                 <option key={ent.value} value={ent.value}>                                                                                                                                      
                     {ent.label}                                                                                                                                                                 
                 </option>                                                                                                                                                                       
             ))}                                                                                                                                                                                 
         </select>                                                                                                                                                                               
                                                                                                                                                                                                 
     Validasi ganti dari:                                                                                                                                                                        
                                                                                                                                                                                                 
         const validEntity = APPROVAL_ENTITY_TYPES.find(ent => ent.value === formData.entity_type);                                                                                              
                                                                                                                                                                                                 
     Menjadi:                                                                                                                                                                                    
                                                                                                                                                                                                 
         const validEntity = entityTypes.find(ent => ent.value === formData.entity_type);                                                                                                        
                                                                                                                                                                                                 
     4d. CARD RENDER — entity config dari API (bukan hardcoded)                                                                                                                                  
                                                                                                                                                                                                 
         const entityConfig = entityTypes.find(ent => ent.value === workflow.entity_type);                                                                                                       
                                                                                                                                                                                                 
         const IconComponent = entityConfig?.icon                                                                                                                                                
             ? (LucideIcons as any)[entityConfig.icon]                                                                                                                                           
             : null;                                                                                                                                                                             
                                                                                                                                                                                                 
         {entityConfig ? (                                                                                                                                                                       
             <div className={flex items-center gap-1.5 mt-2 text-xs font-medium uppercase tracking-wider ${entityConfig.color || 'text-primary'}}>                                               
                 {IconComponent && <IconComponent size={14} />}                                                                                                                                  
                 {entityConfig.label}                                                                                                                                                            
             </div>                                                                                                                                                                              
         ) : (                                                                                                                                                                                   
             // Fallback untuk entity yang sudah dihapus/soft-delete                                                                                                                             
             <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">                                                                                                         
                 {workflow.entity_type} (deleted)                                                                                                                                                
             </p>                                                                                                                                                                                
         )}                                                                                                                                                                                      
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 5: FRONTEND — CUSTOM ENTITY MANAGEMENT UI                                                                                                                                            
                                                                                                                                                                                                 
     Buat modal/UI untuk manage entity types. Lokasi: di ApprovalWorkflowSettings.tsx                                                                                                            
     atau halaman terpisah.                                                                                                                                                                      
                                                                                                                                                                                                 
     5a. DI APPROVAL WORKFLOW SETTINGS — tambah tombol:                                                                                                                                          
                                                                                                                                                                                                 
         <button onClick={openEntityManager}>                                                                                                                                                    
             <Settings size={16} /> Manage Entity Types                                                                                                                                          
         </button>                                                                                                                                                                               
                                                                                                                                                                                                 
     5b. MODAL: Manage Entity Types                                                                                                                                                              
                                                                                                                                                                                                 
         ┌─────────────────────────────────────────────┐                                                                                                                                         
         │  Manage Approval Entity Types          [✕]  │                                                                                                                                         
         ├─────────────────────────────────────────────┤                                                                                                                                         
         │                                             │                                                                                                                                         
         │  ┌─────────────────────────────────────┐    │                                                                                                                                         
         │  │ Asset (asset)           [Edit] [✕]  │    │                                                                                                                                         
         │  │ Asset creation, sale...   ⭐ System │    │                                                                                                                                         
         │  └─────────────────────────────────────┘    │                                                                                                                                         
         │                                              │                                                                                                                                        
         │  ┌─────────────────────────────────────┐    │                                                                                                                                         
         │  │ Work Order (work_order)  [Edit] [✕] │    │                                                                                                                                         
         │  │ Maintenance work order... ⭐ System │    │                                                                                                                                         
         │  └─────────────────────────────────────┘    │                                                                                                                                         
         │                                              │                                                                                                                                        
         │  ┌─────────────────────────────────────┐    │                                                                                                                                         
         │  │ Contract (contract)      [Edit] [✕] │    │                                                                                                                                         
         │  │ Contract approval workflow  New!   │    │                                                                                                                                          
         │  └─────────────────────────────────────┘    │                                                                                                                                         
         │                                              │                                                                                                                                        
         │  [+ Add New Entity Type]                    │                                                                                                                                         
         └─────────────────────────────────────────────┘                                                                                                                                         
                                                                                                                                                                                                 
     5c. Modal: Add/Edit Entity Type                                                                                                                                                             
                                                                                                                                                                                                 
         ┌─────────────────────────────────────────────┐                                                                                                                                         
         │  Add New Entity Type                  [✕]  │                                                                                                                                          
         ├─────────────────────────────────────────────┤                                                                                                                                         
         │                                             │                                                                                                                                         
         │  Entity Value *    [contract             ] │                                                                                                                                          
         │  (lowercase, underscore-only)              │                                                                                                                                          
         │                                             │                                                                                                                                         
         │  Label *           [Contract             ] │                                                                                                                                          
         │                                             │                                                                                                                                         
         │  Description       [Contract approval... ] │                                                                                                                                          
         │                                             │                                                                                                                                         
         │  Icon (Lucide)     [FileText             ] │                                                                                                                                          
         │                                             │                                                                                                                                         
         │  Color             [text-blue-400       ] ↓ │                                                                                                                                         
         │    [text-green] [text-blue] [text-red]      │                                                                                                                                         
         │    [text-purple] [text-teal] [text-amber]   │                                                                                                                                         
         │                                             │                                                                                                                                         
         │  Backend Module    [contract_service     ]  │                                                                                                                                         
         │                                             │                                                                                                                                         
         │  [Cancel]               [Create Entity]     │                                                                                                                                         
         └─────────────────────────────────────────────┘                                                                                                                                         
                                                                                                                                                                                                 
     5d. Validasi di Frontend:                                                                                                                                                                   
                                                                                                                                                                                                 
         - Value: hanya lowercase + underscore, wajib                                                                                                                                            
         - Label: wajib, min 2 chars                                                                                                                                                             
         - Cek duplikat: panggil API list dulu, cek apakah value sudah ada                                                                                                                       
         - Icon: cek apakah valid Lucide icon name                                                                                                                                               
                                                                                                                                                                                                 
     5e. System entity (is_system = true):                                                                                                                                                       
                                                                                                                                                                                                 
         - Tampilkan badge "⭐ System"                                                                                                                                                           
         - Tombol [Edit] hanya untuk label, description, icon, color                                                                                                                             
         - Tombol [✕] HIDDEN — system entity tidak bisa dihapus                                                                                                                                  
                                                                                                                                                                                                 
     5f. Custom entity (is_system = false):                                                                                                                                                      
                                                                                                                                                                                                 
         - Tampilkan badge "Custom"                                                                                                                                                              
         - Tombol [Edit] full (semua field)                                                                                                                                                      
         - Tombol [✕] visible — soft delete                                                                                                                                                      
         - Saat hapus: konfirmasi "Are you sure? Existing workflows will still work."                                                                                                            
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 6: AUTO-SEED SAAT MIGRATIONS BARU                                                                                                                                                    
                                                                                                                                                                                                 
     Tambah prosedur: setiap kali ada migration yang create modul baru,                                                                                                                          
     developer bisa tambah entity type via SQL:                                                                                                                                                  
                                                                                                                                                                                                 
         INSERT INTO approval_entity_types (value, label, icon, color, description, backend_module, is_system)                                                                                   
         VALUES (                                                                                                                                                                                
             'purchase_order',                                                                                                                                                                   
             'Purchase Order',                                                                                                                                                                   
             'ShoppingCart',                                                                                                                                                                     
             'text-indigo-400',                                                                                                                                                                  
             'Purchase order approval requests',                                                                                                                                                 
             'purchase_service',                                                                                                                                                                 
             true                                                                                                                                                                                
         )                                                                                                                                                                                       
         ON CONFLICT (value) DO NOTHING;                                                                                                                                                         
                                                                                                                                                                                                 
     Dengan ON CONFLICT DO NOTHING, migrasi bisa idempotent.                                                                                                                                     
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     BAGIAN 7: VERIFIKASI                                                                                                                                                                        
                                                                                                                                                                                                 
     1. Jalankan migration → 9 entity types ter-seed di DB                                                                                                                                       
     2. Buka Approval Workflow Settings                                                                                                                                                          
        - Dropdown entity type menampilkan 9 item dari API (bukan hardcoded)                                                                                                                     
     3. Klik Manage Entity Types                                                                                                                                                                 
        - Lihat 9 entity system (badge ⭐)                                                                                                                                                       
     4. Klik Add New Entity Type                                                                                                                                                                 
        - Isi: value="contract", label="Contract", icon="FileText"                                                                                                                               
        - Submit → entity baru muncul di list                                                                                                                                                    
     5. Kembali ke form Approval Workflow                                                                                                                                                        
        - Dropdown sekarang ada 10 item termasuk "Contract"                                                                                                                                      
     6. Buat workflow dengan entity "Contract" → sukses                                                                                                                                          
     7. Coba via Postman: entity_type = "xyz"                                                                                                                                                    
        - Backend tolak: "Must be a registered entity type"                                                                                                                                      
     8. Hapus custom entity "Contract"                                                                                                                                                           
        - Entity hilang dari dropdown                                                                                                                                                            
        - Workflow yang pakai entity "contract" tetap ada (fallback label)                                                                                                                       
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     FILE BARU:                                                                                                                                                                                  
     - migrations/XXX_create_approval_entity_types.sql     (BARU)                                                                                                                                
     - web-admin/src/api/approvalEntityTypes.ts             (BARU)                                                                                                                               
     - crates/core/src/domain/entities/approval_entity_type.rs (BARU)                                                                                                                            
     - crates/core/src/infrastructure/repositories/approval_entity_type_repository.rs (BARU)                                                                                                     
     - crates/core/src/application/services/approval_entity_service.rs (BARU)                                                                                                                    
     - crates/api-server/src/api/handlers/approval_entity_handler.rs (BARU)                                                                                                                      
                                                                                                                                                                                                 
     FILE DIUBAH:                                                                                                                                                                                
     - web-admin/src/pages/ApprovalWorkflowSettings.tsx     (MODIFY: fetch dari API)                                                                                                             
     - web-admin/src/config/approvalEntities.ts             (DELETE → ganti API)                                                                                                                 
     - crates/core/src/application/services/approval_workflow_service.rs (MODIFY: validasi)                                                                                                      
     - crates/api-server/src/api/routes/contract_routes.rs   (MODIFY: tambah routes)                                                                                                             
     - crates/api-server/src/api/server.rs atau AppState     (MODIFY: inject ApprovalEntityService)                                                                                              
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════                                                                                                                     
                                                                                                                                                                                                 
     TIDAK PERLU DIUBAH:                                                                                                                                                                         
     - ApprovalWorkflow entity struct — entity_type tetap VARCHAR(50)                                                                                                                            
     - approval_workflows table schema — hanya tambah FK                                                                                                                                         
                                                                                                                                                                                                 
     ═══════════════════════════════════════════════════════════════════════   