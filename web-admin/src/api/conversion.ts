import { api } from './client';

export interface AssetConversion {
    id: string;
    request_number: string;
    asset_id: string;
    title: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled';
    from_category_id: string;
    to_category_id: string;
    target_specifications?: any;
    conversion_cost: number;
    cost_treatment: 'capitalize' | 'expense';
    reason: string;
    notes?: string;
    requested_by: string;
    approved_by?: string;
    executed_by?: string;
    request_date: string;
    approval_date?: string;
    execution_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateConversionRequest {
    asset_id: string;
    title: string;
    to_category_id: string;
    target_specifications?: any;
    conversion_cost: number;
    cost_treatment: 'capitalize' | 'expense';
    reason: string;
}

export interface ExecuteConversionRequest {
    notes?: string;
}

export const conversionApi = {
    createRequest: async (assetId: string, data: CreateConversionRequest) => {
        const response = await api.post<any>(`/assets/${assetId}/conversion-requests`, data);
        return response.data;
    },

    getPendingRequests: async () => {
        const response = await api.get<any>('/conversion-requests/pending');
        return response.data?.data || [];
    },

    getAssetConversions: async (assetId: string) => {
        const response = await api.get<any>(`/assets/${assetId}/conversion-requests`);
        return response.data?.data || [];
    },

    getById: async (id: string) => {
        const response = await api.get<any>(`/conversion-requests/${id}`);
        return response.data?.data;
    },

    approveRequest: async (id: string) => {
        const response = await api.put<any>(`/conversion-requests/${id}/approve`);
        return response.data;
    },

    rejectRequest: async (id: string) => {
        const response = await api.put<any>(`/conversion-requests/${id}/reject`);
        return response.data;
    },

    executeConversion: async (id: string, data: ExecuteConversionRequest) => {
        const response = await api.post<any>(`/conversion-requests/${id}/execute`, data);
        return response.data;
    },
};
