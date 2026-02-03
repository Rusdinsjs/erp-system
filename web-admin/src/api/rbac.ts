import { api } from './http';
import type { Role, Permission } from '../types';

export const rbacApi = {
    listRoles: async () => {
        const response = await api.get<Role[]>('/rbac/roles');
        return response.data;
    },

    listPermissions: async () => {
        const response = await api.get<Permission[]>('/rbac/permissions');
        return response.data;
    },

    getRolePermissions: async (roleId: string) => {
        const response = await api.get<Permission[]>(`/rbac/roles/${roleId}/permissions`);
        return response.data;
    },

    updateRolePermissions: async (roleId: string, permissionIds: string[]) => {
        const response = await api.post(`/rbac/roles/${roleId}/permissions`, {
            permission_ids: permissionIds,
        });
        return response.data;
    },

    // Role CRUD
    createRole: async (data: { code: string; name: string; description: string; role_level: number }) => {
        const response = await api.post<Role>('/rbac/roles', data);
        return response.data;
    },

    updateRole: async (id: string, data: { name?: string; description?: string; role_level?: number }) => {
        const response = await api.put<Role>(`/rbac/roles/${id}`, data);
        return response.data;
    },

    deleteRole: async (id: string) => {
        const response = await api.delete(`/rbac/roles/${id}`);
        return response.data;
    },

    // User Roles
    getUserRoles: async (userId: string) => {
        const response = await api.get<Role[]>(`/users/${userId}/roles`);
        return response.data;
    },

    getUserPermissions: async (userId: string) => {
        const response = await api.get<Permission[]>(`/users/${userId}/permissions`);
        return response.data;
    },

    assignRole: async (userId: string, roleCode: string) => {
        const response = await api.post(`/users/${userId}/roles/${roleCode}`);
        return response.data;
    },

    removeRole: async (userId: string, roleCode: string) => {
        const response = await api.delete(`/users/${userId}/roles/${roleCode}`);
        return response.data;
    },

    // Helper to get my permissions (if endpoint exists, else parse token)
    // For now we assume token has permissions or we fetch from user
};
