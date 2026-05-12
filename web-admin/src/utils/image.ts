import { api } from '../api/http';

export const getImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';

    // Handle paths that might be missing /api prefix
    if (path.startsWith('/uploads')) {
        return `${baseUrl}/api${path}`;
    }

    return `${baseUrl}${path}`;
};
