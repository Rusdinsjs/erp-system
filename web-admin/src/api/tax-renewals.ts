import { api } from './http';

export type TaxRenewalStatus = 'PENDING_INPUT' | 'PENDING_APPROVAL' | 'APPROVED' | 'INVOICED' | 'PAID' | 'COMPLETED';

export interface TaxRenewal {
    id: string;
    asset_id: string;
    asset_name?: string;
    license_plate?: string;
    document_type: string;
    current_expiry: string;
    renewal_cost?: number;
    status: TaxRenewalStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateRenewalCostRequest {
    renewal_cost: number;
    notes?: string;
}

export interface CompleteTaxRenewalRequest {
    new_expiry_date: string; // YYYY-MM-DD
}

export const taxRenewalApi = {
    list: async (status?: string) => {
        const response = await api.get<TaxRenewal[]>('/tax-renewals', { params: { status } });
        return response.data;
    },

    submitCost: async (id: string, data: UpdateRenewalCostRequest) => {
        const response = await api.put<TaxRenewal>(`/tax-renewals/${id}/cost`, data);
        return response.data;
    },

    approve: async (id: string) => {
        const response = await api.put<TaxRenewal>(`/tax-renewals/${id}/approve`);
        return response.data;
    },

    complete: async (id: string, data: CompleteTaxRenewalRequest) => {
        const response = await api.put<TaxRenewal>(`/tax-renewals/${id}/complete`, data);
        return response.data;
    }
};
