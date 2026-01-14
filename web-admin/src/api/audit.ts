import { api } from "./client";

export interface AuditSession {
    id: string;
    user_id: string;
    status: 'open' | 'closed';
    notes: string | null;
    created_at: string;
    closed_at: string | null;
}

export interface AuditRecord {
    id: string;
    session_id: string;
    asset_id: string;
    status: string;
    notes: string | null;
    scanned_at: string;
    asset_code?: string;
    asset_name?: string;
}

export interface AuditProgress {
    total: number;
    audited: number;
}

export const auditApi = {
    startSession: async (notes?: string) => {
        const { data } = await api.post<AuditSession>('/audit/sessions', { notes });
        return data;
    },

    getActiveSession: async () => {
        const { data } = await api.get<AuditSession | null>('/audit/sessions/active');
        return data;
    },

    closeSession: async (id: string) => {
        const { data } = await api.post<AuditSession>(`/audit/sessions/${id}/close`);
        return data;
    },

    submitRecord: async (sessionId: string, assetId: string, status: string, notes?: string) => {
        const { data } = await api.post<AuditRecord>(`/audit/sessions/${sessionId}/records`, {
            asset_id: assetId,
            status,
            notes
        });
        return data;
    },

    getProgress: async (sessionId: string) => {
        const { data } = await api.get<AuditProgress>(`/audit/sessions/${sessionId}/progress`);
        return data;
    }
};
