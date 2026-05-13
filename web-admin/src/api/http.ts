import axios from 'axios';
import { showToast } from '../components/ui/Toast';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.response?.data?.message || 'Something went wrong';

        // Ignore 401s as they are handled by auth store redirection (usually)
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            showToast('Session expired. Please login again.', 'error', 'Authentication Error');
        } else if (error.response?.status === 404 && error.config?.url?.includes('/audit-sessions/active')) {
            // Ignore 404 for active session check - it just means no session is active
            return Promise.resolve({ data: null });
        } else if (error.response?.status >= 400) {
            // General API errors
            showToast(message, 'error', 'Error');
        }

        return Promise.reject(error);
    }
);
