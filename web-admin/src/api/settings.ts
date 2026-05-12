import { api } from './http';

export interface Setting {
    key: string;
    value: any;
    description?: string;
    updated_at?: string;
    updated_by?: string;
}

export const settingsApi = {
    getAll: async (): Promise<Setting[]> => {
        const response = await api.get<{ data: Setting[] }>('/settings');
        return response.data.data;
    },

    update: async (key: string, value: any, description?: string): Promise<Setting> => {
        const response = await api.put<{ data: Setting }>(`/settings/${key}`, {
            value,
            description
        });
        return response.data.data;
    },

    getPublic: async (): Promise<any> => {
        const response = await api.get<{ data: any }>('/public-settings');
        return response.data.data;
    },

    uploadFile: async (file: File): Promise<{ url: string; id: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ url: string; id: string }>('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
