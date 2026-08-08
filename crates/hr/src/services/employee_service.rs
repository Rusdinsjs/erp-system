use management_system_core::application::dto::{
    CreateEmployeeRequest, CreateEmployeeUserRequest, UpdateEmployeeRequest,
};
use management_system_core::application::services::UserService;
use crate::domain::entities::Employee;
use crate::repositories::EmployeeRepository;
use management_system_core::shared::errors::AppError;
use management_system_core::domain::errors::DomainError;
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
        if (self.repository.get_by_nik(&req.nik).await?).is_some() {
            return Err(AppError::Domain(
                DomainError::bad_request(&format!(
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
            is_account_requested: Some(
                req.is_account_requested
                    .unwrap_or(req.user_creation.is_some()),
            ),
            is_active: true,
            photo_url: req.photo_url,

            // Biodata
            ktp_number: req.ktp_number,
            place_of_birth: req.place_of_birth,
            date_of_birth: req.date_of_birth,
            gender: req.gender,
            marital_status: req.marital_status,
            religion: req.religion,
            address: req.address,
            blood_type: None, // Not in create request yet? Check DTO.

            // Emergency
            emergency_contact_name: None,
            emergency_contact_phone: None,
            emergency_contact_relation: None,

            // Employment
            start_date: req.start_date,
            end_contract_date: req.end_contract_date,
            is_manager: req.is_manager.unwrap_or(false),
            manager_id: req.manager_id,

            // Payroll
            bank_account: req.bank_account,
            bank_name: req.bank_name,
            npwp: None,
            bpjs_kesehatan: None,
            bpjs_tenaga_kerja: None,
            basic_salary: req.basic_salary,

            // Education
            education: None,

            leave_balance: 12, // Default annual leave
            leave_used: 0,

            created_at: Utc::now(),
            updated_at: Utc::now(),
            department_name: None,
            assigned_asset_id: None,
            work_area_id: None,
        };

        let created_employee = self.repository.create(&employee).await?;

        // Handle User Creation if requested
        if let Some(user_req) = req.user_creation {
            let _ = self.create_user(created_employee.id, user_req).await?;
            return self.repository.get_by_id(created_employee.id).await;
        }

        Ok(created_employee)
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Employee, AppError> {
        self.repository.get_by_id(id).await
    }

    pub async fn list(&self, page: i64, per_page: i64) -> Result<Vec<Employee>, AppError> {
        self.repository.list(page, per_page).await
    }

    pub async fn update(&self, id: Uuid, req: UpdateEmployeeRequest) -> Result<Employee, AppError> {
        let mut employee = self.repository.get_by_id(id).await?;

        // Capture user_creation req before consuming req
        let user_creation_req = req.user_creation.clone();

        if let Some(nik) = req.nik {
            // Check if new NIK exists for other employees
            if nik != employee.nik && (self.repository.get_by_nik(&nik).await?).is_some() {
                return Err(AppError::Domain(
                    DomainError::bad_request(&format!(
                        "Employee with NIK {} already exists",
                        nik
                    )),
                ));
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
        if let Some(photo) = req.photo_url {
            employee.photo_url = Some(photo);
        }
        if let Some(req_acc) = req.is_account_requested {
            employee.is_account_requested = Some(req_acc);
        } else if req.user_creation.is_some() {
            employee.is_account_requested = Some(true);
        }

        // Biodata Updates
        if let Some(ktp) = req.ktp_number {
            employee.ktp_number = Some(ktp);
        }
        if let Some(pob) = req.place_of_birth {
            employee.place_of_birth = Some(pob);
        }
        if let Some(dob) = req.date_of_birth {
            employee.date_of_birth = Some(dob);
        }
        if let Some(gender) = req.gender {
            employee.gender = Some(gender);
        }
        if let Some(status) = req.marital_status {
            employee.marital_status = Some(status);
        }
        if let Some(rel) = req.religion {
            employee.religion = Some(rel);
        }
        if let Some(addr) = req.address {
            employee.address = Some(addr);
        }
        if let Some(blood) = req.blood_type {
            employee.blood_type = Some(blood);
        }

        // Emergency Contact
        if let Some(name) = req.emergency_contact_name {
            employee.emergency_contact_name = Some(name);
        }
        if let Some(phone) = req.emergency_contact_phone {
            employee.emergency_contact_phone = Some(phone);
        }
        if let Some(rel) = req.emergency_contact_relation {
            employee.emergency_contact_relation = Some(rel);
        }

        // Employment Updates
        if let Some(start) = req.start_date {
            employee.start_date = Some(start);
        }
        if let Some(end) = req.end_contract_date {
            employee.end_contract_date = Some(end);
        }
        if let Some(is_mgr) = req.is_manager {
            employee.is_manager = is_mgr;
        }
        if let Some(mgr_id) = req.manager_id {
            employee.manager_id = Some(mgr_id);
        }

        // Payroll Updates
        if let Some(acc) = req.bank_account {
            employee.bank_account = Some(acc);
        }
        if let Some(name) = req.bank_name {
            employee.bank_name = Some(name);
        }
        if let Some(npwp) = req.npwp {
            employee.npwp = Some(npwp);
        }
        if let Some(bpjs_k) = req.bpjs_kesehatan {
            employee.bpjs_kesehatan = Some(bpjs_k);
        }
        if let Some(bpjs_tk) = req.bpjs_tenaga_kerja {
            employee.bpjs_tenaga_kerja = Some(bpjs_tk);
        }
        if let Some(salary) = req.basic_salary {
            employee.basic_salary = Some(salary);
        }

        // Education
        if let Some(edu) = req.education {
            employee.education = Some(edu);
        }

        self.repository.update(&employee).await?;

        // If employee is deactivated or status is inactive/resigned/terminated, auto-deactivate linked user
        let is_inactive_status = matches!(
            employee.employment_status.to_lowercase().as_str(),
            "resigned" | "terminated" | "inactive" | "non-active"
        );
        if !employee.is_active || is_inactive_status {
            let _ = self.user_service.deactivate_by_employee_id(id).await;
        }

        // Handle User Creation if requested and not linked
        if let Some(user_req) = user_creation_req {
            if employee.user_id.is_none() {
                let _ = self.create_user(employee.id, user_req).await?;
                return self.repository.get_by_id(employee.id).await;
            }
        }

        Ok(employee)
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
                DomainError::conflict("Employee already has a user account"),
            ));
        }

        // 3. Create user via UserService
        let user_req = management_system_core::application::dto::CreateUserRequest {
            email: req.email,
            password: req.password,
            name: employee.name.clone(),
            role_code: req.role,
            department: employee.department_name.clone(),
            department_id: employee.department_id,
            organization_id: None, // Default organization
            employee_id: Some(id),
            allowed_asset_group: None,
        };

        let user = self.user_service.create_user(user_req).await?;

        // 4. Link user_id to employee
        employee.user_id = Some(user.id);
        self.repository.update(&employee).await
    }
}
