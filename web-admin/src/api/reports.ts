import { api } from './client';

export const reportsApi = {
    exportAssets: async () => {
        const response = await api.get('/reports/assets', {
            responseType: 'blob',
        });
        return response.data;
    },

    exportMaintenance: async (startDate: string, endDate: string) => {
        const response = await api.get('/reports/maintenance', {
            params: { start_date: startDate, end_date: endDate },
            responseType: 'blob',
        });
        return response.data;
    },
};
