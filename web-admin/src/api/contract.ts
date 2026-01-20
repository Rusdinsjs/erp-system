import { api } from './http';
import type { CreateContractRequest, UpdateContractRequest } from '../types/contract';

export const contractApi = {
    list: async () => {
        const { data } = await api.get('/contracts');
        return data;
    },

    listExpiring: async () => {
        const { data } = await api.get('/contracts?expiring_soon=true');
        return data;
    },

    get: async (id: string) => {
        const { data } = await api.get(`/contracts/${id}`);
        return data;
    },

    create: async (contract: CreateContractRequest) => {
        const { data } = await api.post('/contracts', contract);
        return data;
    },

    update: async (id: string, contract: UpdateContractRequest) => {
        const { data } = await api.patch(`/contracts/${id}`, contract);
        return data;
    }
};
