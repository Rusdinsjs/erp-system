import axios from 'axios';
import { showToast } from '../components/ui/Toast';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        const headers = config.headers || {};
        headers.Authorization = 'Bearer ' + token;
        config.headers = headers;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const headers = error.config?.headers;
        const hasSuppressHeader = headers && (headers['X-Suppress-Toast'] || headers['x-suppress-toast']);
        
        if (
            hasSuppressHeader ||
            error.config?.url?.includes('/public-settings') ||
            error.config?.url?.includes('/audit/sessions/active')
        ) {
            return Promise.reject(error);
        }

        const message = error.response?.data?.error || error.response?.data?.message;

        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            showToast('Session expired. Please login again.', 'error', 'Authentication Error');
        } else if (error.response?.status >= 400) {
            if (message) {
                showToast(message, 'error', 'Error');
            }
        } else if (!error.response && !axios.isCancel(error)) {
            if (error.config?.method?.toUpperCase() !== 'GET') {
                showToast('Tidak dapat terhubung ke server backend', 'error', 'Koneksi Gagal');
            }
        }

        return Promise.reject(error);
    }
);
