import { api } from './http';
import type { ContractTemplate, CreateContractTemplateRequest, UpdateContractTemplateRequest } from '../types/contractTemplate';

export const contractTemplateApi = {
    // Get all templates
    getAll: async (): Promise<ContractTemplate[]> => {
        const response = await api.get<ContractTemplate[]>('/contracts/templates');
        return response.data;
    },

    // Get template by ID
    getById: async (id: string): Promise<ContractTemplate> => {
        const response = await api.get<ContractTemplate>(`/contracts/templates/${id}`);
        return response.data;
    },

    // Create new template
    create: async (data: CreateContractTemplateRequest): Promise<ContractTemplate> => {
        const response = await api.post<ContractTemplate>('/contracts/templates', data);
        return response.data;
    },

    // Update template
    update: async (id: string, data: UpdateContractTemplateRequest): Promise<ContractTemplate> => {
        const response = await api.patch<ContractTemplate>(`/contracts/templates/${id}`, data);
        return response.data;
    },

    // Delete template
    delete: async (id: string): Promise<void> => {
        await api.delete(`/contracts/templates/${id}`);
    },
};
