import { api } from './http';

export interface FuelLog {
    id: string;
    tracking_number: string;
    asset_id: string;
    asset_name?: string;
    requested_by: string;
    requester_name?: string;
    driver_id?: string;
    odometer_reading: number;
    odometer_image_url: string;
    request_type: 'volume' | 'amount';
    requested_value: number;
    status: 'requested' | 'approved' | 'rejected' | 'completed';
    coupon_code?: string;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    actual_filled_amount?: number;
    actual_volume?: number;
    receipt_image_url?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    previous_odometer?: number;
    previous_fuel_volume?: number;
}

export interface CreateFuelRequest {
    asset_id: string;
    odometer_reading: number;
    odometer_image_url: string;
    request_type: 'volume' | 'amount';
    requested_value: number;
    driver_id?: string;
}

export interface CompleteFuelRequest {
    actual_filled_amount: number;
    actual_volume?: number;
    receipt_image_url: string;
}

export const fuelApi = {
    listHistory: async (page = 1, limit = 20) => {
        const response = await api.get<{ data: FuelLog[]; pagination: any }>(`/fuel`, {
            params: { page, limit }
        });
        return response.data;
    },

    listPending: async () => {
        const response = await api.get<{ data: FuelLog[] }>(`/fuel/pending`);
        return response.data.data;
    },

    request: async (data: CreateFuelRequest) => {
        const response = await api.post<{ data: FuelLog }>(`/fuel`, data);
        return response.data.data;
    },

    approve: async (id: string) => {
        const response = await api.post<{ data: string }>(`/fuel/${id}/approve`);
        return response.data.data; // Coupon Code
    },

    reject: async (id: string, reason: string) => {
        await api.post(`/fuel/${id}/reject`, { reason });
    },

    complete: async (id: string, data: CompleteFuelRequest) => {
        await api.post(`/fuel/${id}/complete`, data);
    },

    getStats: async () => {
        const response = await api.get<{ data: { requested: number; approved: number; completed: number; rejected: number } }>(`/fuel/stats`);
        return response.data.data;
    },

    listMyRequests: async () => {
        const response = await api.get<{ data: FuelLog[] }>(`/fuel/my-requests`);
        return response.data.data;
    },

    getAnalytics: async () => {
        const response = await api.get<{ data: FuelAnalyticsData }>(`/fuel/analytics`);
        return response.data.data;
    }
};

export interface FuelAnalyticsData {
    monthly_spend: {
        month: string;
        total_spend: number;
        total_liters: number;
    }[];
    top_assets: {
        asset_name: string;
        total_cost: number;
        total_liters: number;
    }[];
}
