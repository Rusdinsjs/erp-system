import { api } from './http';
import type { Location, CreateLocationRequest } from '../types';

export type { Location, CreateLocationRequest };

export const locationApi = {
    list: async () => {
        const response = await api.get<Location[]>('/locations');
        return response.data;
    },

    getHierarchy: async () => {
        const response = await api.get<Location[]>('/locations/hierarchy');
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<Location>(`/locations/${id}`);
        return response.data;
    },

    create: async (data: CreateLocationRequest) => {
        const response = await api.post<Location>('/locations', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateLocationRequest>) => {
        const response = await api.put<Location>(`/locations/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await api.delete(`/locations/${id}`);
    },
};
