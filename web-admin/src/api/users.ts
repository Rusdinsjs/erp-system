import { api } from './client';

export interface UserSummary {
    id: string;
    email: string;
    name: string;
    role_code: string;
    role_level: number;
    department_id?: string;
    is_active: boolean;
    employee_name?: string;
    employee_nik?: string;
}

export const usersApi = {
    list: async (page = 1, limit = 20) => {
        const response = await api.get('/users', { params: { page, limit } });
        return response.data;
    },

    // Helper to fetch roles for editing
    listRoles: async () => {
        const response = await api.get('/rbac/roles');
        return response.data;
    },

    assignRole: async (userId: string, roleCode: string) => {
        const response = await api.post(`/users/${userId}/roles/${roleCode}`);
        return response.data;
    },

    create: async (data: CreateUserRequest) => {
        const response = await api.post('/users', data);
        return response.data;
    },

    update: async (userId: string, data: UpdateUserRequest) => {
        const response = await api.put(`/users/${userId}`, data);
        return response.data;
    },

    delete: async (userId: string) => {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    }
};

export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    role_code: string;
    department_id?: string;
    organization_id?: string;
}

export interface UpdateUserRequest {
    name?: string;
    role_code?: string;
    department_id?: string;
    is_active?: boolean;
    password?: string;
}
