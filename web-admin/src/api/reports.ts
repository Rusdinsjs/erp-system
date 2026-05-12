import { api } from './http';

export const reportsApi = {
    exportAssets: async () => {
        const response = await api.get('/reports/assets', {
            responseType: 'blob',
        });
        return response.data;
    },

    exportAssetsPdf: async () => {
        const response = await api.get('/reports/assets/pdf', {
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

    exportFuel: async (format: 'csv' | 'pdf' = 'csv') => {
        const endpoint = format === 'pdf' ? '/reports/fuel/pdf' : '/reports/fuel';
        const response = await api.get(endpoint, {
            responseType: 'blob',
        });
        return response.data;
    },

    exportWorkOrders: async (format: 'csv' | 'pdf' = 'csv') => {
        const endpoint = format === 'pdf' ? '/reports/work-orders/pdf' : '/reports/work-orders';
        const response = await api.get(endpoint, {
            responseType: 'blob',
        });
        return response.data;
    },

    exportLoans: async (format: 'csv' | 'pdf' = 'csv') => {
        const endpoint = format === 'pdf' ? '/reports/loans/pdf' : '/reports/loans';
        const response = await api.get(endpoint, {
            responseType: 'blob',
        });
        return response.data;
    },
};
