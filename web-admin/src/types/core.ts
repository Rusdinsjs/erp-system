export interface ApiResponse<T> {
    success: boolean;
    message: string | null;
    data: T;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface UserSummary {
    id: string;
    email: string;
    name: string;
    role_code: string;
    role_level: number;
    department?: string;
    department_id?: string;
    is_active: boolean;
    employee_id?: string;
    employee_name?: string;
    employee_nik?: string;
    employee_photo_url?: string;
    allowed_asset_group?: string;
}

export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    role_code: string;
    department?: string;
    department_id?: string;
    organization_id?: string;
    employee_id?: string;
    allowed_asset_group?: string;
}

export interface UpdateUserRequest {
    name?: string;
    role_code?: string;
    department?: string;
    department_id?: string;
    is_active?: boolean;
    password?: string;
    employee_id?: string;
    clear_employee_link?: boolean;
    allowed_asset_group?: string;
}

export interface Location {
    id: string;
    parent_id?: string | null;
    code: string;
    name: string;
    location_type: string;
    address?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    capacity?: number | null;
    current_count?: number | null;
    created_at: string;
    updated_at: string;
    children?: Location[];
}

export interface CreateLocationRequest {
    parent_id?: string | null;
    code: string;
    name: string;
    location_type: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    capacity?: number;
}

export interface Department {
    id: string;
    code: string;
    name: string;
    description?: string;
    parent_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DepartmentTreeNode extends Department {
    children: DepartmentTreeNode[];
}

export interface CreateDepartmentRequest {
    code: string;
    name: string;
    description?: string;
    parent_id?: string;
}

export interface UpdateDepartmentRequest extends Partial<CreateDepartmentRequest> { }

export interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    role_level: number;
    is_system: boolean;
}

export interface Permission {
    id: string;
    code: string;
    resource: string;
    action: string;
    description?: string;
}

export interface AuditLog {
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    user_id: string;
    user_name: string;
    ip_address?: string;
    user_agent?: string;
    old_data?: any;
    new_data?: any;
    created_at: string;
}
