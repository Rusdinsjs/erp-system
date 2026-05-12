import { api } from './http';
import type {
    Asset,
    AssetDocument,
    AssetSearchParams,
    CreateAssetDocumentRequest,
    CreateAssetRequest,
    UpdateAssetRequest,
    AssetExpense,
    CreateAssetExpenseRequest,
    BulkUpdateAssetRequest,
    SellAssetRequest
} from '../types';

export type {
    Asset,
    AssetDocument,
    AssetSearchParams,
    CreateAssetDocumentRequest,
    CreateAssetRequest,
    UpdateAssetRequest,
    AssetExpense,
    CreateAssetExpenseRequest,
    BulkUpdateAssetRequest,
    SellAssetRequest
};

export const assetApi = {
    list: async (params: AssetSearchParams) => {
        const response = await api.get<any>('/assets/search', { params });
        const { data, pagination } = response.data;
        // Flatten the response to match PaginatedResponse interface
        return {
            data,
            total: pagination.total,
            page: pagination.page,
            per_page: pagination.per_page,
            total_pages: pagination.total_pages
        };
    },

    get: async (id: string) => {
        const response = await api.get<Asset>(`/assets/${id}`);
        return response.data;
    },

    create: async (data: CreateAssetRequest) => {
        const response = await api.post<Asset>('/assets', data);
        return response.data;
    },

    update: async (id: string, data: UpdateAssetRequest) => {
        const response = await api.put<Asset>(`/assets/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/assets/${id}`);
        return response.data;
    },

    sell: async (id: string, data: SellAssetRequest) => {
        const response = await api.post<Asset>(`/assets/${id}/sell`, data);
        return response.data;
    },

    getVehicleDetails: async (_assetId: string) => {
        return null;
    },

    getDashboardStats: async () => {
        const response = await api.get('/dashboard');
        return response.data;
    },

    getDocuments: async (id: string) => {
        const response = await api.get<AssetDocument[]>(`/assets/${id}/documents`);
        return response.data;
    },

    addDocument: async (id: string, data: CreateAssetDocumentRequest) => {
        const response = await api.post<AssetDocument>(`/assets/${id}/documents`, data);
        return response.data;
    },

    uploadFile: async (file: File, onProgress?: (percent: number) => void) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ url: string; original_name: string; content_type: string; size: number }>('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            }
        });
        return response.data;
    },

    bulkUpdate: async (data: BulkUpdateAssetRequest) => {
        const response = await api.post<number>('/assets/bulk-update', data);
        return response.data;
    },

    getExpenses: async (id: string) => {
        const response = await api.get<AssetExpense[]>(`/assets/${id}/expenses`);
        return response.data;
    },

    createExpense: async (id: string, data: CreateAssetExpenseRequest) => {
        const response = await api.post<AssetExpense>(`/assets/${id}/expenses`, data);
        return response.data;
    },

    approveExpense: async (expenseId: string, notes?: string) => {
        const response = await api.post<AssetExpense>(`/expenses/${expenseId}/approve`, { notes });
        return response.data;
    },

    rejectExpense: async (expenseId: string, notes: string) => {
        const response = await api.post<AssetExpense>(`/expenses/${expenseId}/reject`, { notes });
        return response.data;
    },

    getExpiring: async (days: number = 30) => {
        const response = await api.get<Asset[]>('/assets/expiring', { params: { days } });
        return response.data;
    }
};
