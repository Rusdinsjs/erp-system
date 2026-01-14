import axios from 'axios';
import { showToast } from '../components/ui/Toast';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
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
        const message = error.response?.data?.message || 'Something went wrong';
        console.error(message);

        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            showToast('Please login again', 'error', 'Session Expired');
        }

        return Promise.reject(error);
    }
);
