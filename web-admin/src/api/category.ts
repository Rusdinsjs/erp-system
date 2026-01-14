import { api } from './client';

export interface Category {
    id: string;
    name: string;
    code: string;
    parent_id?: string;
    description?: string;
    attributes?: any;
    children?: Category[];
}

export const categoryApi = {
    list: async () => {
        const response = await api.get<Category[]>('/categories');
        return response.data;
    },

    getTree: async () => {
        const response = await api.get<Category[]>('/categories/tree');
        return response.data;
    },

    create: async (data: Partial<Category>) => {
        const response = await api.post<Category>('/categories', data);
        return response.data;
    },
};
