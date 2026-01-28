import { api } from './http';

export interface Loan {
    id: string;
    loan_number: string;
    asset_id: string;
    borrower_id?: string;
    employee_id?: string;
    approver_id?: string;

    loan_date: string;
    expected_return_date: string;
    actual_return_date?: string;

    status: 'requested' | 'approved' | 'rejected' | 'checked_out' | 'in_use' | 'overdue' | 'returned' | 'damaged' | 'lost';

    condition_before?: string;
    condition_after?: string;
    damage_description?: string;
    check_out_photos?: string[];
    return_photos?: string[];

    borrower_name?: string; // Joined
    employee_name?: string; // Joined
    asset_name?: string; // Joined

    created_at: string;
    updated_at: string;
}

export interface CreateLoanRequest {
    asset_id: string;
    borrower_id?: string; // User ID
    employee_id?: string; // Employee ID (optional if linked)
    loan_date: string; // YYYY-MM-DD
    expected_return_date: string; // YYYY-MM-DD
    purpose?: string;
    deposit_amount?: number;
}

export interface LoanQueryParams {
    page?: number;
    per_page?: number;
    asset_id?: string;
}

export const loanApi = {
    list: async (params?: LoanQueryParams) => {
        const response = await api.get<Loan[]>('/loans', { params });
        return response.data;
    },

    listOverdue: async () => {
        const response = await api.get<Loan[]>('/loans/overdue');
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<Loan>(`/loans/${id}`);
        return response.data;
    },

    create: async (data: CreateLoanRequest) => {
        const response = await api.post<{ message: string; data: Loan }>('/loans', data);
        return response.data;
    },

    approve: async (id: string) => {
        const response = await api.post(`/loans/${id}/approve`);
        return response.data;
    },

    reject: async (id: string, reason?: string) => {
        const response = await api.post(`/loans/${id}/reject`, { reason });
        return response.data;
    },

    checkout: async (id: string, condition: string, photos?: string[]) => {
        const response = await api.post(`/loans/${id}/checkout`, { condition, photos });
        return response.data;
    },

    returnLoan: async (id: string, condition: string, photos?: string[]) => {
        // "return" matches backend path checkin_loan, usually mapped to /loans/:id/return
        const response = await api.post(`/loans/${id}/return`, { condition, photos });
        return response.data;
    },

    myLoans: async () => {
        const response = await api.get<Loan[]>('/loans/my');
        return response.data;
    },

    getAnalytics: async () => {
        const response = await api.get<{ data: LoanAnalyticsData }>('/loans/analytics');
        return response.data.data;
    }
};

export interface LoanAnalyticsData {
    status_counts: {
        status: string;
        count: number;
    }[];
    active_loans: number;
    overdue_loans: number;
    most_borrowed: {
        asset_name: string;
        loan_count: number;
    }[];
}
