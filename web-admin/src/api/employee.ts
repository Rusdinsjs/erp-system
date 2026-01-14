import { api } from './client';

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
