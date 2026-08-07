import { api } from '../api/http';
import { useAuthStore } from '../store/useAuthStore';

export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';

    let finalUrl = '';
    // Handle paths that might be missing /api prefix
    if (path.startsWith('/uploads')) {
        finalUrl = `${baseUrl}/api${path}`;
    } else {
        finalUrl = `${baseUrl}${path}`;
    }

    const token = useAuthStore.getState().token;
    if (token && finalUrl.includes('/uploads/')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        return `${finalUrl}${separator}token=${token}`;
    }

    return finalUrl;
};
