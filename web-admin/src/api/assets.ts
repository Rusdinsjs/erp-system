import { api } from './client';

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
}

export interface CreateAssetRequest extends Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'status'> {
    status?: string;
    vehicle_details?: VehicleDetails;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> { }

export interface AssetSearchParams {
    query?: string;
    category_id?: string;
    location_id?: string;
    status?: string;
    page: number;
    per_page: number;
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
        const response = await api.get<PaginatedResponse<Asset>>('/assets/search', { params });
        return response.data;
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

    getVehicleDetails: async (_assetId: string) => {
        return null;
    }
};
