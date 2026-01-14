import { api } from "./client";

export interface Client {
    id: string;
    client_code: string;
    name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    tax_id?: string;
    is_active?: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export const clientApi = {
    list: (params?: { limit?: number; offset?: number }) =>
        api.get<PaginatedResponse<Client>>("/clients", { params }),

    get: (id: string) =>
        api.get<ApiResponse<Client>>(`/clients/${id}`),

    create: (data: Partial<Client>) =>
        api.post<ApiResponse<Client>>("/clients", data),

    update: (id: string, data: Partial<Client>) =>
        api.put<ApiResponse<Client>>(`/clients/${id}`, data),

    search: (q: string) =>
        api.get<ApiResponse<Client[]>>("/clients/search", { params: { q } }),
};
