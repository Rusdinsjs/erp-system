import { api } from './client';

export const authApi = {
    login: async (credentials: any) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/auth/profile');
        return response.data;
    },
    changePassword: async (old_password: string, new_password: string) => {
        const response = await api.put('/me/password', { old_password, new_password });
        return response.data;
    }
};
