import { api } from './client';

// ==================== INTERFACES ====================

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
    rate_basis?: 'hourly' | 'daily' | 'monthly';
    minimum_hours?: number;
    overtime_multiplier?: number;
    standby_multiplier?: number;
    breakdown_penalty_per_day?: number;
    hours_per_day?: number;
    days_per_month?: number;
}

export interface Rental {
    id: string;
    rental_number: string;
    client_id: string;
    asset_id: string;
    rental_rate_id?: string;
    start_date: string;
    expected_end_date?: string;
    actual_end_date?: string;
    status: 'draft' | 'requested' | 'pending_approval' | 'approved' | 'rented_out' | 'returned' | 'completed' | 'cancelled' | 'rejected';
    notes?: string;

    // Joins
    client_name?: string;
    asset_name?: string;
    rate_name?: string;
    daily_rate?: number;
}

export interface CreateRentalRequest {
    client_id: string;
    asset_id: string;
    rental_rate_id?: string;
    start_date: string; // YYYY-MM-DD
    end_date?: string;
    daily_rate?: number;
    deposit_amount?: number;
    notes?: string;
}

export interface CreateClientRequest {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
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

    dispatchRental: async (id: string, data: { driver_name?: string, truck_plate?: string, notes?: string, location_id?: string | null }) => {
        const response = await api.post(`/rentals/${id}/dispatch`, data);
        return response.data;
    },

    returnRental: async (id: string, data: { return_date: string, meter_reading?: number, notes?: string, location_id?: string | null }) => {
        const response = await api.post(`/rentals/${id}/return`, data);
        return response.data;
    },
};
