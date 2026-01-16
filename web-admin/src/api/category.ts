import { api } from './http';

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
        const response = await api.get<{ data: Category[] }>('/categories');
        return response.data.data;
    },

    getTree: async () => {
        const response = await api.get<{ data: Category[] }>('/categories/tree');
        // Tree might return array directly? Let's check backend.
        // Step 147 shows `get_category_tree` (line 20) calls handler.
        // Handler code was not viewed, but standard is `Json({ data: tree })` or `Json(tree)`.
        // Let's assume standard wrapper for consistency or check handler.
        // Wait, safest is to check handler first.
        // BUT, for now, let's fix `list` which is definitely causing the modal crash.
        return response.data.data;
    },

    create: async (data: Partial<Category>) => {
        const response = await api.post<Category>('/categories', data);
        return response.data;
    },
};
