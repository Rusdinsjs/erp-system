import { api } from './http';

export interface VehicleDetails {
    license_plate?: string;
    brand?: string;
    model?: string;
    color?: string;
    vin?: string;
    engine_number?: string;
    bpkb_number?: string;
    stnk_expiry?: string;
    kir_expiry?: string;
    tax_expiry?: string;
    heavy_equipment_tax_expiry?: string;
    fuel_type?: string;
    transmission?: string;
    capacity?: string;
    odometer_last?: number;
}

export interface Asset {
    id: string;
    asset_code: string;
    name: string;
    category_id: string;
    location_id?: string;
    department_id?: string;
    assigned_to?: string;
    vendor_id?: string;

    status: string;
    asset_class?: string;
    condition_id?: number;
    is_rental?: boolean;
    is_fuel?: boolean;
    is_loan?: boolean;

    serial_number?: string;
    brand?: string;
    model?: string;
    year_manufacture?: number;

    specifications?: any;
    vehicle_details?: VehicleDetails; // Added field

    purchase_date?: string;
    purchase_price?: number;
    currency_id?: number;
    unit_id?: number;
    quantity?: number;
    residual_value?: number;
    useful_life_months?: number;

    notes?: string;
    qr_code_url?: string;

    created_at?: string;
    updated_at?: string;

    category_name?: string;
    location_name?: string;
    department_name?: string;
    department_manager_name?: string;
    assigned_to_name?: string;
    vendor_name?: string;

    // Aggregates
    total_maintenance_cost?: number;
    total_rental_income?: number;

    version: number;
}

export interface AssetDocument {
    id: string;
    asset_id: string;
    name: string;
    type: string;
    file_path: string;
    mime_type?: string;
    size_bytes?: number;
    expiry_date?: string;
    notes?: string;
    uploaded_by?: string;
    created_at?: string;
}

export interface CreateAssetDocumentRequest {
    name: string;
    type: string;
    file_path: string;
    mime_type?: string;
    size_bytes?: number;
    expiry_date?: string;
    notes?: string;
}

export interface CreateAssetRequest extends Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'status'> {
    status?: string;
    vehicle_details?: VehicleDetails;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {
    version?: number;
}

export interface BulkUpdateAssetRequest {
    asset_ids: string[];
    status?: string;
    location_id?: string;
    department?: string;
    department_id?: string;
}

export interface AssetSearchParams {
    query?: string;
    category_id?: string;
    location_id?: string;
    department?: string;
    status?: string;
    is_rental?: boolean;
    is_fuel?: boolean;
    is_loan?: boolean;
    page: number;
    per_page: number;
    exact_match?: boolean;
    sort_by?: string;
    sort_order?: string;
}

export interface SellAssetRequest {
    sale_price: number;
    sale_date: string;
    sold_to: string;
    notes?: string;
}

export interface AssetExpenseItem {
    id: string;
    description: string;
    amount: number;
}

export interface AssetExpense {
    id: string;
    asset_id: string;
    description: string;
    amount: number;
    date: string;
    vendor_name?: string;
    invoice_number?: string;
    proof_url?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    expense_type: 'OPEX' | 'CAPEX';
    requested_by: string;
    created_at: string;
    updated_at: string;
    items?: AssetExpenseItem[];
}

export interface CreateAssetExpenseItemRequest {
    description: string;
    amount: number;
}

export interface CreateAssetExpenseRequest {
    description: string;
    items: CreateAssetExpenseItemRequest[];
    date: string;
    vendor_name?: string;
    invoice_number?: string;
    proof_url?: string;
    expense_type?: 'OPEX' | 'CAPEX';
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

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
