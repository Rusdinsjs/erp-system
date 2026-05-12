import { api } from './http';

export interface JournalLine {
    id: string;
    account_id: string;
    description?: string;
    debit: number;
    credit: number;
}

export interface JournalEntry {
    id: string;
    transaction_number: string;
    date: string;
    description: string;
    reference?: string;
    status: 'draft' | 'posted';
    created_by?: string;
    created_at: string;
}

export interface JournalEntryDetail {
    header: JournalEntry;
    lines: JournalLine[];
}

export interface CreateJournalLineRequest {
    account_id: string;
    description?: string;
    debit: number;
    credit: number;
}

export interface CreateJournalEntryRequest {
    date: string;
    description: string;
    reference?: string;
    lines: CreateJournalLineRequest[];
}

export interface ListJournalsParams {
    page?: number;
    limit?: number;
}

export const journalApi = {
    list: async (params?: ListJournalsParams) => {
        const response = await api.get<JournalEntry[]>('/finance/journals', { params });
        return response.data;
    },

    getDetails: async (id: string) => {
        const response = await api.get<JournalEntryDetail>(`/finance/journals/${id}`);
        return response.data;
    },

    create: async (data: CreateJournalEntryRequest) => {
        const response = await api.post<JournalEntryDetail>('/finance/journals', data);
        return response.data;
    },
};
