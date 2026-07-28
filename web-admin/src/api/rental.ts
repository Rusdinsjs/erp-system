import { api } from './http';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface RentalClient {
    id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
    is_active: boolean;
}

export interface RentalRate {
    id: string;
    name: string;
    description?: string;
    rate_amount: number; // Corrected from daily_rate
    currency: string;
    is_active: boolean;

    // Enhanced Billing Config
    rate_basis?: 'hourly' | 'daily' | 'monthly' | 'bcm';
    minimum_hours?: number;
    overtime_multiplier?: number;
    standby_multiplier?: number;
    breakdown_penalty_per_day?: number;
    hours_per_day?: number;
    days_per_month?: number;
    fuel_surcharge_rate?: number;
    tier_config?: any; // JSON
}

// Header + Items structure
export interface RentalItem {
    id: string;
    asset_id: string;
    asset_name?: string;
    asset_code?: string;
    rental_rate_id?: string;
    rate_name?: string;
    rental_rate_amount?: number;
    status: string; // rented_out, returned
    notes?: string;
}

export interface Rental {
    id: string;
    rental_number: string;
    client_id: string;
    client_name?: string;
    start_date: string;
    expected_end_date?: string;
    actual_end_date?: string;
    status: 'draft' | 'requested' | 'pending_approval' | 'approved' | 'rented_out' | 'returned' | 'completed' | 'cancelled' | 'rejected';
    notes?: string;

    // Multi-Asset
    items?: RentalItem[];
    total_amount?: number;
    asset_name?: string;
}

export interface CreateRentalItemRequest {
    asset_id: string;
    rental_rate_id: string;
    rate_amount: number; // Snapshot
    notes?: string;
}

export interface CreateRentalRequest {
    client_id: string;
    start_date: string;
    end_date?: string;
    deposit_amount?: number;
    notes?: string;

    // List of assets to rent
    items: CreateRentalItemRequest[];
}

export interface CreateClientRequest {
    name: string;
    company_name?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    contact_person?: string;
    tax_id?: string;
    notes?: string;
}

export interface CreateRateRequest {
    name: string;
    description?: string;
    daily_rate: number;
    currency: string;

    rate_basis?: string;
    minimum_hours?: number;
    overtime_multiplier?: number;
    standby_multiplier?: number;
    breakdown_penalty_per_day?: number;
    fuel_surcharge_rate?: number;
    tier_config?: any;
    hours_per_day?: number;
    days_per_month?: number;
}

// ==================== API ====================

export const rentalApi = {
    // Clients
    listClients: async () => {
        const response = await api.get<RentalClient[]>('/clients');
        return response.data;
    },

    createClient: async (data: CreateClientRequest) => {
        const response = await api.post<RentalClient>('/clients', data);
        return response.data;
    },

    // Rates
    listRentalRates: async () => {
        const response = await api.get<RentalRate[]>('/rental-rates');
        return response.data;
    },

    createRentalRate: async (data: CreateRateRequest) => {
        const response = await api.post<RentalRate>('/rental-rates', data);
        return response.data;
    },

    updateRentalRate: async (id: string, data: Partial<CreateRateRequest>) => {
        const response = await api.put<RentalRate>(`/rental-rates/${id}`, data);
        return response.data;
    },

    deleteRentalRate: async (id: string) => {
        const response = await api.delete(`/rental-rates/${id}`);
        return response.data;
    },

    // Rentals
    listRentals: async (status?: string) => {
        const params = status ? { status } : {};
        const response = await api.get<Rental[]>('/rentals', { params });
        return response.data;
    },

    getRental: async (id: string) => {
        const response = await api.get<Rental>(`/rentals/${id}`);
        return response.data;
    },

    updateRental: async (id: string, data: { start_date?: string; expected_end_date?: string; deposit_amount?: number; notes?: string }) => {
        const response = await api.put<ApiResponse<Rental>>(`/rentals/${id}`, data);
        return response.data;
    },

    deleteRental: async (id: string) => {
        const response = await api.delete(`/rentals/${id}`);
        return response.data;
    },

    createRental: async (data: CreateRentalRequest) => {
        const response = await api.post<Rental>('/rentals', data);
        return response.data;
    },

    approveRental: async (id: string, notes?: string) => {
        const response = await api.post(`/rentals/${id}/approve`, { notes });
        return response.data;
    },

    rejectRental: async (id: string, reason: string) => {
        const response = await api.post(`/rentals/${id}/reject`, { reason });
        return response.data;
    },

    dispatchRental: async (id: string, data: { rental_item_id: string, condition_rating?: string, condition_notes?: string, photos?: string[], location_id?: string | null }) => {
        const response = await api.post(`/rentals/${id}/dispatch`, data);
        return response.data;
    },

    returnRental: async (id: string, data: { rental_item_id: string, return_date: string, meter_reading: number, condition_rating?: string, condition_notes?: string, has_damage?: boolean, damage_description?: string, location_id?: string | null }) => {
        const response = await api.post(`/rentals/${id}/return`, data);
        return response.data;
    },

    getSchedule: async (start: string, end: string) => {
        const response = await api.get(`/rentals/schedule?start=${start}&end=${end}`);
        return response.data;
    },

    // Handovers
    getHandovers: async (id: string) => {
        const response = await api.get<any[]>(`/rentals/${id}/handovers`);
        return response.data;
    },

    addHandoverPhoto: async (handoverId: string, photoUrl: string, description?: string) => {
        const response = await api.post(`/rentals/handovers/${handoverId}/photos`, { photo_url: photoUrl, description });
        return response.data;
    },
};
