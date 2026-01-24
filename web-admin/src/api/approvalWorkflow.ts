import { api } from './http';
import type { ApprovalWorkflow, ApprovalWorkflowRequest } from '../types/contract';

export const approvalWorkflowApi = {
    getAll: async (): Promise<ApprovalWorkflow[]> => {
        const { data } = await api.get('/approval-workflows');
        return data;
    },

    getById: async (id: string): Promise<ApprovalWorkflow> => {
        const { data } = await api.get(`/approval-workflows/${id}`);
        return data;
    },

    create: async (request: ApprovalWorkflowRequest): Promise<ApprovalWorkflow> => {
        const { data } = await api.post('/approval-workflows', request);
        return data;
    },

    update: async (id: string, request: ApprovalWorkflowRequest): Promise<ApprovalWorkflow> => {
        const { data } = await api.patch(`/approval-workflows/${id}`, request);
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/approval-workflows/${id}`);
    },

    getActive: async (entityType: string): Promise<ApprovalWorkflow | null> => {
        const workflows = await approvalWorkflowApi.getAll();
        return workflows.find(w => w.entity_type === entityType && w.is_active) || null;
    }
};
