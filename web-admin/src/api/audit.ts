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

export interface AuditSession {
    id: string;
    created_at: string;
    status: 'active' | 'closed';
    created_by: string;
}

export interface AuditProgress {
    total: number;
    audited: number;
    total_assets?: number; // Optional alias if backend uses different naming
}

export const auditApi = {
    getLogs: async (params: AuditLogQuery) => {
        const res = await api.get<PaginatedResponse<AuditLogEntry>>('/audit-logs', { params });
        return res.data;
    },

    // Session Management
    getActiveSession: async () => {
        const res = await api.get<any>('/audit/sessions/active');
        return res.data?.data?.session || null;
    },

    startSession: async () => {
        const res = await api.post<any>('/audit/sessions');
        return res.data?.data;
    },

    closeSession: async (id: string) => {
        const res = await api.post<any>(`/audit/sessions/${id}/close`);
        return res.data?.data;
    },

    // Progress & Actions
    getProgress: async (sessionId: string) => {
        const res = await api.get<any>(`/audit/sessions/${sessionId}/progress`);
        return res.data?.data;
    },

    submitRecord: async (sessionId: string, assetId: string, status: string, notes?: string) => {
        const res = await api.post<any>(`/audit/sessions/${sessionId}/records`, {
            asset_id: assetId,
            status,
            notes
        });
        return res.data?.data;
    }
};
