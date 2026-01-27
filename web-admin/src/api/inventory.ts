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
    // Add other item methods as needed
    batchAdjust: async (data: BatchInventoryAdjustmentRequest) => {
        const response = await api.post('/inventory/adjust/batch', data);
        return response.data.data;
    },
};

export interface BatchInventoryAdjustmentRequest {
    items: InventoryAdjustmentItem[];
    notes?: string;
}

export interface InventoryAdjustmentItem {
    item_id: string;
    quantity: number;
    unit_price?: number;
}
