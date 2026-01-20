import { api } from './http';

export interface RentalBillingPeriod {
    id: string;
    rental_id: string;
    period_start: string;
    period_end: string;
    period_type: string;

    total_operating_hours: number;
    total_standby_hours: number;
    total_overtime_hours: number;
    total_breakdown_hours: number;
    total_production_volume?: number;

    hourly_rate: number;
    minimum_hours: number;

    billable_hours: number;
    shortfall_hours: number;

    base_amount: number;
    standby_amount: number;
    overtime_amount: number;
    breakdown_penalty_amount: number;

    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;

    // KPI Metrics
    mechanical_availability?: number;    // MA %
    physical_availability?: number;      // PA %
    utilization_availability?: number;   // UA %
    effective_utilization?: number;      // EU %
    ma_threshold?: number;               // Default 85%
    availability_penalty?: number;       // Penalty amount

    // Adjustment
    adjustment_notes?: string;
    adjusted_by?: string;
    adjusted_at?: string;

    // Fuel & Advanced
    total_fuel_consumed?: number;
    fuel_surcharge_rate?: number;
    fuel_surcharge_amount?: number;

    status: string;
    invoice_number?: string;
}

export const rentalBillingApi = {
    // Preview billing calculation
    preview: async (rentalId: string, startDate: string, endDate: string) => {
        const { data } = await api.post<RentalBillingPeriod>(`/rentals/${rentalId}/billing/preview`, {
            start_date: startDate,
            end_date: endDate,
        });
        return data;
    },

    // Create finalize billing
    create: async (rentalId: string, startDate: string, endDate: string) => {
        const { data } = await api.post<RentalBillingPeriod>(`/rentals/${rentalId}/billing`, {
            start_date: startDate,
            end_date: endDate,
        });
        return data;
    },

    // List billings
    listByRental: async (rentalId: string) => {
        const { data } = await api.get<RentalBillingPeriod[]>(`/rentals/${rentalId}/billing`);
        return data;
    },

    // Download PDF
    downloadPdf: async (rentalId: string, billingId: string) => {
        const response = await api.get(`/rentals/${rentalId}/billing/${billingId}/pdf`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Email Invoice
    emailInvoice: async (rentalId: string, billingId: string, toEmail: string) => {
        const { data } = await api.post(`/rentals/${rentalId}/billing/${billingId}/pdf`, {
            to_email: toEmail
        });
        return data;
    },

    // Update/adjust billing period (draft or calculated only)
    updateBilling: async (billingId: string, data: {
        base_amount?: number;
        standby_amount?: number;
        overtime_amount?: number;
        breakdown_penalty_amount?: number;
        mobilization_fee?: number;
        demobilization_fee?: number;
        other_charges?: number;
        other_charges_description?: string;
        discount_percentage?: number;
        adjustment_notes?: string;
    }) => {
        const { data: response } = await api.patch(`/rentals/billing/${billingId}`, data);
        return response.data || response;
    },
};
