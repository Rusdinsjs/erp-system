import { api } from './http';

export interface AuditLogEntry {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    user_name: string | null;
    changes: any;
    timestamp: string;
}

export interface AuditLogQuery {
    page: number;
    per_page: number;
    entity_type?: string;
    action?: string;
    user_id?: string;
    entity_id?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export const auditApi = {
    getLogs: async (params: AuditLogQuery) => {
        const res = await api.get<PaginatedResponse<AuditLogEntry>>('/audit-logs', { params });
        return res.data;
    }
};
