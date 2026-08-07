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

    // Frappe / ERPNext Style DocPerm API
    listDocTypes: async () => {
        const response = await api.get<any[]>('/rbac/doctypes');
        return response.data;
    },

    getDocPerms: async (doctypeId?: string) => {
        const response = await api.get<any[]>('/rbac/docperms', {
            params: { doctype_id: doctypeId }
        });
        return response.data;
    },

    saveDocPerm: async (payload: any) => {
        const response = await api.post('/rbac/docperms', payload);
        return response.data;
    },

    deleteDocPerm: async (id: string) => {
        const response = await api.delete(`/rbac/docperms/${id}`);
        return response.data;
    },

    getUserPermissionsRowLevel: async (userId: string) => {
        const response = await api.get<any[]>(`/rbac/user-permissions/user/${userId}`);
        return response.data;
    },

    createUserPermissionRowLevel: async (payload: any) => {
        const response = await api.post('/rbac/user-permissions', payload);
        return response.data;
    },

    deleteUserPermissionRowLevel: async (id: string) => {
        const response = await api.delete(`/rbac/user-permissions/${id}`);
        return response.data;
    },
};

