import { api } from './client';

export interface Loan {
    id: string;
    asset_id: string;
    borrower_id: string;
    loan_date: string;
    expected_return_date: string;
    actual_return_date?: string;
    status: 'requested' | 'approved' | 'checked_out' | 'in_use' | 'overdue' | 'returned' | 'rejected';
    asset_name?: string;
    loan_number?: string;
    condition_on_out?: string;
}

export const loanApi = {
    getMyLoans: async () => {
        const response = await api.get<Loan[]>('/loans/my');
        return response.data;
    },
    requestLoan: async (data: {
        asset_id: string;
        borrower_id: string;
        loan_date: string;
        expected_return_date: string;
    }) => {
        const response = await api.post<Loan>('/loans', data);
        return response.data;
    },
    getLoanDetails: async (id: string) => {
        const response = await api.get<Loan>(`/loans/${id}`);
        return response.data;
    }
};
