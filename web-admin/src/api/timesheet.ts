import { api } from './client';

// ==================== INTERFACES ====================

export interface ClientContact {
    id: string;
    client_id: string;
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    can_approve_timesheet: boolean;
    can_approve_billing: boolean;
    approval_limit?: number;
    is_primary: boolean;
}

export interface Timesheet {
    id: string;
    rental_id: string;
    checker_id?: string;
    verifier_id?: string;
    client_pic_id?: string;

    work_date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM:SS
    end_time?: string;

    operating_hours?: number;
    standby_hours?: number;
    breakdown_hours?: number;
    overtime_hours?: number;

    hm_km_start?: number;
    hm_km_end?: number;
    hm_km_usage?: number;

    operation_status: string;
    breakdown_reason?: string;
    work_description?: string;
    work_location?: string;

    created_at: string;
    status: 'draft' | 'submitted' | 'verified' | 'approved' | 'rejected' | 'revision';

    checker_notes?: string;
    verifier_notes?: string;
    client_notes?: string;
    photos?: string[];
}

export interface TimesheetDetail extends Timesheet {
    rental_number: string;
    asset_name: string;
    client_name: string;
}

export interface BillingPeriod {
    id: string;
    rental_id: string;
    period_start: string;
    period_end: string;

    total_operating_hours?: number;
    total_overtime_hours?: number;
    // ... other totals

    subtotal?: number;
    tax_amount?: number;
    total_amount?: number;

    status: 'draft' | 'calculated' | 'approved' | 'invoiced' | 'paid';
    invoice_number?: string;
}

export interface CreateTimesheetRequest {
    rental_id: string;
    work_date: string;
    start_time?: string;
    end_time?: string;
    operating_hours: number;
    standby_hours?: number;
    breakdown_hours?: number;
    hm_km_start?: number;
    hm_km_end?: number;
    operation_status: string;
    work_description?: string;
    work_location?: string;
    notes?: string;
}

export interface VerifyTimesheetRequest {
    status: 'approved' | 'rejected' | 'revision';
    notes?: string;
}

export interface CreateBillingRequest {
    rental_id: string;
    period_start: string;
    period_end: string;
    period_type?: string;
}

// ==================== API ====================

export const timesheetApi = {
    // Contacts
    createContact: async (data: any) => {
        const response = await api.post<ClientContact>('/rentals/clients/contacts', data);
        return response.data;
    },

    listContacts: async (clientId: string) => {
        const response = await api.get<ClientContact[]>(`/rentals/clients/${clientId}/contacts`);
        return response.data;
    },

    // Timesheets
    listByRental: async (rentalId: string, startDate?: string, endDate?: string) => {
        const params = { rental_id: rentalId, start_date: startDate, end_date: endDate };
        const response = await api.get<Timesheet[]>('/rentals/timesheets', { params });
        return response.data;
    },

    listPending: async () => {
        const response = await api.get<TimesheetDetail[]>('/rentals/timesheets/pending');
        return response.data;
    },

    create: async (data: CreateTimesheetRequest) => {
        const response = await api.post<Timesheet>('/rentals/timesheets', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateTimesheetRequest>) => {
        const response = await api.put<Timesheet>(`/rentals/timesheets/${id}`, data);
        return response.data;
    },

    submit: async (id: string, notes?: string) => {
        const response = await api.post(`/rentals/timesheets/${id}/submit`, { checker_notes: notes });
        return response.data;
    },

    verify: async (id: string, data: VerifyTimesheetRequest) => {
        const response = await api.post(`/rentals/timesheets/${id}/verify`, data);
        return response.data;
    },

    clientApprove: async (id: string, data: { client_pic_id: string, notes?: string, signature?: string }) => {
        const response = await api.post(`/rentals/timesheets/${id}/approve`, data);
        return response.data;
    },

    getSummary: async (rentalId: string, startDate: string, endDate: string) => {
        const params = { rental_id: rentalId, start_date: startDate, end_date: endDate };
        const response = await api.get('/rentals/timesheets/summary', { params });
        return response.data;
    }
};

export const billingApi = {
    listByRental: async (rentalId: string) => {
        const params = { rental_id: rentalId };
        const response = await api.get<BillingPeriod[]>('/rentals/billing', { params });
        return response.data;
    },

    create: async (data: CreateBillingRequest) => {
        const response = await api.post<BillingPeriod>('/rentals/billing', data);
        return response.data;
    },

    calculate: async (id: string, data: any) => {
        const response = await api.post<BillingPeriod>(`/rentals/billing/${id}/calculate`, data);
        return response.data;
    },

    approve: async (id: string, notes?: string) => {
        const response = await api.post(`/rentals/billing/${id}/approve`, { notes });
        return response.data;
    },

    generateInvoice: async (id: string, invoiceNumber?: string) => {
        const response = await api.post<string>(`/rentals/billing/${id}/invoice`, { invoice_number: invoiceNumber });
        return response.data;
    },

    getSummary: async (id: string) => {
        const response = await api.get(`/rentals/billing/${id}/summary`);
        return response.data;
    }
};
