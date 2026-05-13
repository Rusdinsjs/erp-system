import { api } from './http';

export interface InventoryCategory {
    id: string;
    code: string;
    name: string;
    description: string | null;
    inventory_account_id: string | null;
    expense_account_id: string | null;
    item_count?: number; // Optional count from backend if available
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: string;
    category_id: string;
    unit_id: number;
    sku: string;
    name: string;
    description: string | null;
    min_stock: number;
    max_stock: number;
    initial_quantity: number;
    current_quantity: number;
    purchase_price: number;
    average_cost: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    category_name?: string;
}

export interface CreateInventoryCategoryRequest {
    code: string;
    name: string;
    description?: string;
    inventory_account_id?: string;
    expense_account_id?: string;
}

export interface UpdateInventoryCategoryRequest {
    name?: string;
    description?: string;
    inventory_account_id?: string;
    expense_account_id?: string;
}

export const inventoryApi = {
    // Categories
    listCategories: async () => {
        const response = await api.get('/inventory/categories');
        return response.data.data;
    },
    getCategory: async (id: string) => {
        const response = await api.get(`/inventory/categories/${id}`);
        return response.data.data;
    },
    createCategory: async (data: CreateInventoryCategoryRequest) => {
        const response = await api.post('/inventory/categories', data);
        return response.data.data;
    },
    updateCategory: async (id: string, data: UpdateInventoryCategoryRequest) => {
        const response = await api.put(`/inventory/categories/${id}`, data);
        return response.data.data;
    },
    deleteCategory: async (id: string) => {
        const response = await api.delete(`/inventory/categories/${id}`);
        return response.data.data;
    },

    // Items
    listItems: async (params?: any) => {
        const response = await api.get('/inventory/items', { params });
        return response.data.data;
    },
    getItem: async (id: string) => {
        const response = await api.get(`/inventory/items/${id}`);
        return response.data.data;
    },
    createItem: async (data: any) => {
        const response = await api.post('/inventory/items', data);
        return response.data.data;
    },
    updateItem: async (id: string, data: any) => {
        const response = await api.put(`/inventory/items/${id}`, data);
        return response.data.data;
    },
    deleteItem: async (id: string) => {
        const response = await api.delete(`/inventory/items/${id}`);
        return response.data.data;
    },
    listMovements: async (params?: { item_id?: string; limit?: number }) => {
        const response = await api.get('/inventory/movements', { params });
        return response.data.data;
    },
    // Add other item methods as needed
    batchAdjust: async (data: BatchInventoryAdjustmentRequest) => {
        const response = await api.post('/inventory/adjust/batch', data);
        return response.data.data;
    },

    bulkCreate: async (data: { items: any[] }) => {
        const response = await api.post('/inventory/items/bulk', data);
        return response.data.data;
    },

    // Documents
    listDocuments: async (id: string) => {
        const response = await api.get(`/inventory/items/${id}/documents`);
        return response.data.data;
    },
    addDocument: async (id: string, data: any) => {
        const response = await api.post(`/inventory/items/${id}/documents`, data);
        return response.data.data;
    },
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

export interface InventoryDocument {
    id: string;
    item_id: string;
    name: string;
    type: string;
    file_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    expiry_date: string | null;
    notes: string | null;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface InventoryMovement {
    id: string;
    item_id: string;
    movement_type: 'IN_PURCHASE' | 'IN_ADJUSTMENT' | 'OUT_USAGE' | 'OUT_ADJUSTMENT' | 'OUT_TRANSFER';
    quantity: number;
    unit_price: number;
    total_value: number;
    reference_id?: string;
    reference_number?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
}

export interface BatchInventoryAdjustmentRequest {
    items: InventoryAdjustmentItem[];
    notes?: string;
}

export interface InventoryAdjustmentItem {
    item_id: string;
    quantity: number;
    unit_price?: number;
}
