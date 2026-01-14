import { api } from './client';

// Types
export interface AssetState {
    value: string;
    label: string;
    color: string;
    is_terminal: boolean;
}

export interface AssetStateWithApproval extends AssetState {
    requires_approval: boolean;
    approval_level: number; // 0=None, 1=Supervisor, 2=Manager
}

export interface LifecycleHistory {
    id: string;
    asset_id: string;
    from_state: string;
    to_state: string;
    reason: string | null;
    performed_by: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface AssetConversion {
    id: string;
    asset_id: string;
    from_category_id: string | null;
    to_category_id: string | null;
    from_subtype: string | null;
    to_subtype: string | null;
    conversion_type: string;
    conversion_cost: number | null;
    old_specifications: Record<string, unknown> | null;
    new_specifications: Record<string, unknown> | null;
    justification: string;
    status: string;
    requested_by: string;
    approved_by: string | null;
    approved_at: string | null;
    executed_by: string | null;
    executed_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateConversionRequest {
    from_category_id?: string;
    to_category_id?: string;
    from_subtype?: string;
    to_subtype?: string;
    conversion_type: string;
    conversion_cost?: number;
    old_specifications?: Record<string, unknown>;
    new_specifications?: Record<string, unknown>;
    justification: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

// Lifecycle API
export const lifecycleApi = {
    getAllStates: async (): Promise<AssetState[]> => {
        const res = await api.get<ApiResponse<AssetState[]>>('/lifecycle/states');
        return res.data.data;
    },

    getValidTransitions: async (assetId: string): Promise<AssetState[]> => {
        const res = await api.get<ApiResponse<AssetState[]>>(`/assets/${assetId}/lifecycle/valid-transitions`);
        return res.data.data;
    },

    getValidTransitionsWithApproval: async (assetId: string): Promise<AssetStateWithApproval[]> => {
        const res = await api.get<ApiResponse<AssetStateWithApproval[]>>(`/assets/${assetId}/lifecycle/valid-transitions-with-approval`);
        return res.data.data;
    },

    getHistory: async (assetId: string): Promise<LifecycleHistory[]> => {
        const res = await api.get<ApiResponse<LifecycleHistory[]>>(`/assets/${assetId}/lifecycle/history`);
        return res.data.data;
    },

    transitionAsset: async (assetId: string, targetState: string, reason?: string): Promise<LifecycleHistory> => {
        const res = await api.post<ApiResponse<LifecycleHistory>>(`/assets/${assetId}/lifecycle/transition`, {
            target_state: targetState,
            reason,
        });
        return res.data.data;
    },

    requestTransition: async (assetId: string, targetState: string, reason?: string): Promise<TransitionResponse> => {
        const res = await api.post<ApiResponse<TransitionResponse>>(`/assets/${assetId}/lifecycle/request-transition`, {
            target_state: targetState,
            reason,
        });
        return res.data.data;
    },

    getCurrentStatus: async (assetId: string): Promise<AssetState> => {
        const res = await api.get<ApiResponse<AssetState>>(`/assets/${assetId}/lifecycle/status`);
        return res.data.data;
    },
};

// Transition response types
export interface TransitionResponse {
    result_type: 'Executed' | 'ApprovalCreated';
    history?: LifecycleHistory;
    approval_request_id?: string;
    message?: string;
}

// Conversion API
export const conversionApi = {
    createRequest: async (assetId: string, data: CreateConversionRequest): Promise<AssetConversion> => {
        const res = await api.post<ApiResponse<AssetConversion>>(`/assets/${assetId}/conversion-requests`, data);
        return res.data.data;
    },

    getAssetConversions: async (assetId: string): Promise<AssetConversion[]> => {
        const res = await api.get<ApiResponse<AssetConversion[]>>(`/assets/${assetId}/conversion-requests`);
        return res.data.data;
    },

    getPendingConversions: async (): Promise<AssetConversion[]> => {
        const res = await api.get<ApiResponse<AssetConversion[]>>('/conversion-requests/pending');
        return res.data.data;
    },

    getConversion: async (id: string): Promise<AssetConversion> => {
        const res = await api.get<ApiResponse<AssetConversion>>(`/conversion-requests/${id}`);
        return res.data.data;
    },

    approve: async (id: string): Promise<AssetConversion> => {
        const res = await api.put<ApiResponse<AssetConversion>>(`/conversion-requests/${id}/approve`);
        return res.data.data;
    },

    reject: async (id: string, reason: string): Promise<AssetConversion> => {
        const res = await api.put<ApiResponse<AssetConversion>>(`/conversion-requests/${id}/reject`, { reason });
        return res.data.data;
    },

    execute: async (id: string): Promise<AssetConversion> => {
        const res = await api.post<ApiResponse<AssetConversion>>(`/conversion-requests/${id}/execute`);
        return res.data.data;
    },

    complete: async (id: string): Promise<AssetConversion> => {
        const res = await api.post<ApiResponse<AssetConversion>>(`/conversion-requests/${id}/complete`);
        return res.data.data;
    },
};
