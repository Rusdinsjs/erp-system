import { api } from './http';

export interface WorkflowWithDocType {
    id: string;
    workflow_name: string;
    doctype_id: string;
    doctype_name: string;
    is_active: boolean;
    document_status_field: string;
    created_at: string;
    updated_at: string;
}

export interface WorkflowState {
    id?: string;
    workflow_id?: string;
    state_name: string;
    doc_status: number; // 0: Draft, 1: Submitted, 2: Cancelled
    allow_edit_role_id?: string;
    style_variant: string;
    created_at?: string;
}

export interface WorkflowTransitionDetail {
    id: string;
    workflow_id: string;
    state_id: string;
    state_name: string;
    action_name: string;
    next_state_id: string;
    next_state_name: string;
    allowed_role_id: string;
    allowed_role_name: string;
    allowed_role_code: string;
}

export interface WorkflowDetailResponse {
    workflow: WorkflowWithDocType;
    states: WorkflowState[];
    transitions: WorkflowTransitionDetail[];
}

export const workflowApi = {
    listWorkflows: async () => {
        const response = await api.get<WorkflowWithDocType[]>('/workflows');
        return response.data;
    },

    getWorkflowDetail: async (id: string) => {
        const response = await api.get<WorkflowDetailResponse>(`/workflows/${id}`);
        return response.data;
    },

    createWorkflow: async (payload: { workflow_name: string; doctype_id: string; document_status_field?: string }) => {
        const response = await api.post<WorkflowWithDocType>('/workflows', payload);
        return response.data;
    },

    saveWorkflowState: async (workflowId: string, payload: { state_name: string; doc_status: number; allow_edit_role_id?: string; style_variant: string }) => {
        const response = await api.post<WorkflowState>(`/workflows/${workflowId}/states`, payload);
        return response.data;
    },

    saveWorkflowTransition: async (workflowId: string, payload: { state_id: string; action_name: string; next_state_id: string; allowed_role_id: string }) => {
        const response = await api.post<WorkflowTransitionDetail>(`/workflows/${workflowId}/transitions`, payload);
        return response.data;
    },

    deleteWorkflow: async (id: string) => {
        const response = await api.delete(`/workflows/${id}`);
        return response.data;
    },

    applyWorkflowAction: async (payload: {
        workflow_id: string;
        document_id: string;
        current_state_name: string;
        action_name: string;
        comments?: string;
    }) => {
        const response = await api.post('/workflows/apply-action', payload);
        return response.data;
    },
};
