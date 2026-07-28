import { api } from './http';

export interface ApprovalEntityType {
    id: string;
    value: string;
    label: string;
    icon: string | null;
    color: string | null;
    description: string | null;
    backend_module: string | null;
    is_active: boolean;
    is_system: boolean;
    created_at?: string;
    updated_at?: string;
}

export const approvalEntityTypesApi = {
    list: async (): Promise<ApprovalEntityType[]> => {
        const { data } = await api.get('/approval/entity-types');
        return (data as any)?.data || data || [];
    },

    create: async (reqData: {
        value: string;
        label: string;
        icon?: string;
        color?: string;
        description?: string;
        backend_module?: string;
    }): Promise<ApprovalEntityType> => {
        const { data } = await api.post('/approval/entity-types', reqData);
        return (data as any)?.data || data;
    },

    update: async (
        id: string,
        reqData: {
            label?: string;
            icon?: string;
            color?: string;
            description?: string;
            backend_module?: string;
        }
    ): Promise<ApprovalEntityType> => {
        const { data } = await api.patch(`/approval/entity-types/${id}`, reqData);
        return (data as any)?.data || data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/approval/entity-types/${id}`);
    },
};
