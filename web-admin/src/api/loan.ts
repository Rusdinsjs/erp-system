import { api } from './client';

export interface Loan {
    id: string;
    asset_id: string;
    borrower_id?: string;
    employee_id?: string;
    loan_date: string;
    expected_return_date: string;
    actual_return_date?: string;
    status: 'requested' | 'approved' | 'active' | 'returned' | 'overdue';
    deposit_amount?: number;
    condition_on_out?: string;
    condition_on_return?: string;
    approved_by?: string;
    checked_out_by?: string;
    checked_in_by?: string;
    created_at: string;
    updated_at: string;
    asset_name?: string; // Joined field
    borrower_name?: string; // Joined field
    employee_name?: string; // Joined field
    loan_number?: string;
}

export const loanApi = {
    list: async (params?: any) => {
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
    create: async (data: any) => {
        const response = await api.post<Loan>('/loans', data);
        return response.data;
    },
    approve: async (id: string) => {
        const response = await api.post<Loan>(`/loans/${id}/approve`);
        return response.data;
    },
    checkout: async (id: string, condition: string) => {
        const response = await api.post<Loan>(`/loans/${id}/checkout`, { condition });
        return response.data;
    },
    returnLoan: async (id: string, condition: string) => {
        const response = await api.post<Loan>(`/loans/${id}/return`, { condition });
        return response.data;
    },
    reject: async (id: string, reason?: string) => {
        const response = await api.post<Loan>(`/loans/${id}/reject`, { reason });
        return response.data;
    }
};
