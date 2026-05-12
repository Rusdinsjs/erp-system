import { api } from './http';

export type EmploymentStatus = 'pkwt' | 'pkwtt' | 'magang' | 'lainnya';

export interface Employee {
    id: string;
    nik: string;
    name: string;
    email: string;
    phone?: string;
    department_id?: string;
    department_name?: string;
    position?: string;
    employment_status: EmploymentStatus;
    user_id?: string;
    is_active: boolean;

    // Biodata
    ktp_number?: string;
    place_of_birth?: string;
    date_of_birth?: string;
    gender?: 'L' | 'P';
    marital_status?: string;
    religion?: string;
    address?: string;
    blood_type?: string;

    // Emergency Contact
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;

    // Employment
    start_date?: string;
    end_contract_date?: string;
    is_manager: boolean;
    manager_id?: string;

    // Payroll
    bank_account?: string;
    bank_name?: string;
    npwp?: string;
    bpjs_kesehatan?: string;
    bpjs_tenaga_kerja?: string;
    basic_salary?: number;
    is_allowance?: boolean;

    // Education
    education?: string;

    created_at: string;
    updated_at: string;
}

export const employeeApi = {
    list: async (params?: any) => {
        const response = await api.get<Employee[]>('/employees', { params });
        return response.data;
    },
    get: async (id: string) => {
        const response = await api.get<Employee>(`/employees/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post<Employee>('/employees', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put<Employee>(`/employees/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/employees/${id}`);
        return response.data;
    },
    createUser: async (data: any) => {
        const { employee_id, ...payload } = data;
        const response = await api.post<Employee>(`/employees/${employee_id}/user`, payload);
        return response.data;
    }
};
