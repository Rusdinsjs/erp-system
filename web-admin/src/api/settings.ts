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
        try {
            const response = await api.get<{ data: Setting[] }>('/settings', {
                headers: { 'X-Suppress-Toast': 'true' }
            });
            return response.data.data;
        } catch {
            return [];
        }
    },

    update: async (key: string, value: any, description?: string): Promise<Setting> => {
        const response = await api.put<{ data: Setting }>('/settings/' + key, {
            value,
            description
        });
        return response.data.data;
    },

    getPublic: async (): Promise<any> => {
        try {
            const response = await api.get<{ data: any }>('/public-settings', {
                headers: { 'X-Suppress-Toast': 'true' }
            });
            return response.data?.data ?? null;
        } catch {
            return null;
        }
    },

    uploadFile: async (file: File): Promise<{ url: string; id: string }> => {
        const formData = new FormData();
        formData.append('file', file);

        // Gunakan fetch native (bukan axios) agar Content-Type multipart/boundary di-set otomatis
        // dan tidak ada masalah dengan proxy atau interceptor axios
        const { useAuthStore } = await import('../store/useAuthStore');
        const token = useAuthStore.getState().token;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        // JANGAN set Content-Type — biarkan browser set otomatis dengan boundary yang benar

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            let msg = 'Gagal mengunggah file';
            try {
                const data = await response.json();
                msg = data?.error || data?.message || msg;
            } catch { /* */ }
            throw new Error(msg);
        }

        return response.json();
    }
};
