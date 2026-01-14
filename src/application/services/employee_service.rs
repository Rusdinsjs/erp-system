use crate::application::dto::{
    CreateEmployeeRequest, CreateEmployeeUserRequest, UpdateEmployeeRequest,
};
use crate::application::services::UserService;
use crate::domain::entities::Employee;
use crate::infrastructure::repositories::EmployeeRepository;
use crate::shared::errors::AppError;
use chrono::Utc;
use uuid::Uuid;

#[derive(Clone)]
pub struct EmployeeService {
    repository: EmployeeRepository,
    user_service: UserService,
}

impl EmployeeService {
    pub fn new(repository: EmployeeRepository, user_service: UserService) -> Self {
        Self {
            repository,
            user_service,
        }
    }

    pub async fn create(&self, req: CreateEmployeeRequest) -> Result<Employee, AppError> {
        // Check if NIK already exists
        if let Some(_) = self.repository.get_by_nik(&req.nik).await? {
            return Err(AppError::Domain(
                crate::domain::errors::DomainError::bad_request(&format!(
                    "Employee with NIK {} already exists",
                    req.nik
                )),
            ));
        }

        let employee = Employee {
            id: Uuid::new_v4(),
            nik: req.nik,
            name: req.name,
            email: req.email,
            phone: req.phone,
            department_id: req.department_id,
            position: req.position,
            employment_status: req.employment_status,
            user_id: req.user_id,
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            department_name: None,
        };

        self.repository.create(&employee).await
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Employee, AppError> {
        self.repository.get_by_id(id).await
    }

    pub async fn list(&self, page: i64, per_page: i64) -> Result<Vec<Employee>, AppError> {
        self.repository.list(page, per_page).await
    }

    pub async fn update(&self, id: Uuid, req: UpdateEmployeeRequest) -> Result<Employee, AppError> {
        let mut employee = self.repository.get_by_id(id).await?;

        if let Some(nik) = req.nik {
            // Check if new NIK exists for other employees
            if nik != employee.nik {
                if let Some(_) = self.repository.get_by_nik(&nik).await? {
                    return Err(AppError::Domain(
                        crate::domain::errors::DomainError::bad_request(&format!(
                            "Employee with NIK {} already exists",
                            nik
                        )),
                    ));
                }
            }
            employee.nik = nik;
        }

        if let Some(name) = req.name {
            employee.name = name;
        }
        if let Some(email) = req.email {
            employee.email = email;
        }
        if let Some(phone) = req.phone {
            employee.phone = Some(phone);
        }
        if let Some(dept_id) = req.department_id {
            employee.department_id = Some(dept_id);
        }
        if let Some(pos) = req.position {
            employee.position = Some(pos);
        }
        if let Some(status) = req.employment_status {
            employee.employment_status = status;
        }
        if let Some(user_id) = req.user_id {
            employee.user_id = Some(user_id);
        }
        if let Some(active) = req.is_active {
            employee.is_active = active;
        }

        self.repository.update(&employee).await
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        self.repository.delete(id).await
    }

    pub async fn create_user(
        &self,
        id: Uuid,
        req: CreateEmployeeUserRequest,
    ) -> Result<Employee, AppError> {
        // 1. Get employee data
        let mut employee = self.get_by_id(id).await?;

        // 2. Check if already has user
        if employee.user_id.is_some() {
            return Err(AppError::Domain(
                crate::domain::errors::DomainError::conflict("Employee already has a user account"),
            ));
        }

        // 3. Create user via UserService
        let user_req = crate::application::dto::CreateUserRequest {
            email: req.email,
            password: req.password,
            name: employee.name.clone(),
            role_code: req.role,
            department: employee.department_name.clone(),
            department_id: employee.department_id,
            organization_id: None, // Default organization
        };

        let user = self.user_service.create_user(user_req).await?;

        // 4. Link user_id to employee
        employee.user_id = Some(user.id);
        self.repository.update(&employee).await
    }
}
