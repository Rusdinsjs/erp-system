import { api } from './client';

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
}

export const rbacApi = {
    listRoles: async () => {
        const response = await api.get<any>('/rbac/roles');
        return response.data.data as Role[];
    },

    listPermissions: async () => {
        const response = await api.get<any>('/rbac/permissions');
        return response.data.data as Permission[];
    },

    // Helper to get my permissions (if endpoint exists, else parse token)
    // For now we assume token has permissions or we fetch from user
};
