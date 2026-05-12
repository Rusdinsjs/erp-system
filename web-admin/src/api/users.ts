import { api } from './http';
import type { CreateUserRequest, UpdateUserRequest, UserSummary } from '../types';
export type { CreateUserRequest, UpdateUserRequest, UserSummary };

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
