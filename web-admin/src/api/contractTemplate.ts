import axios from 'axios';
import type { ContractTemplate, CreateContractTemplateRequest, UpdateContractTemplateRequest } from '../types/contractTemplate';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const contractTemplateApi = {
    // Get all templates
    getAll: async (): Promise<ContractTemplate[]> => {
        const response = await api.get<ContractTemplate[]>('/api/contracts/templates');
        return response.data;
    },

    // Get template by ID
    getById: async (id: string): Promise<ContractTemplate> => {
        const response = await api.get<ContractTemplate>(`/api/contracts/templates/${id}`);
        return response.data;
    },

    // Create new template
    create: async (data: CreateContractTemplateRequest): Promise<ContractTemplate> => {
        const response = await api.post<ContractTemplate>('/api/contracts/templates', data);
        return response.data;
    },

    // Update template
    update: async (id: string, data: UpdateContractTemplateRequest): Promise<ContractTemplate> => {
        const response = await api.patch<ContractTemplate>(`/api/contracts/templates/${id}`, data);
        return response.data;
    },

    // Delete template
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/contracts/templates/${id}`);
    },
};
