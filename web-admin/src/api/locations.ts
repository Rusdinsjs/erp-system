import { api } from './client';

export interface Location {
    id: string;
    parent_id?: string | null;
    code: string;
    name: string;
    location_type: string;
    address?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    capacity?: number | null;
    current_count?: number | null;
    created_at: string;
    updated_at: string;
    children?: Location[]; // For hierarchy view
}

export interface CreateLocationRequest {
    parent_id?: string | null;
    code: string;
    name: string;
    location_type: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    capacity?: number;
}

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
