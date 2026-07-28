import { api } from './client';

export interface WorkOrder {
    id: string;
    wo_number: string;
    asset_id: string;
    wo_type: string;
    priority: string | null;
    location_id: string | null;
    status: string;
    scheduled_date: string | null;
    due_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    assigned_technician: string | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    estimated_cost: number | null;
    actual_cost: number | null;
    problem_description: string | null;
    work_performed: string | null;
    asset_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateWorkOrderRequest {
    asset_id: string;
    wo_type: string;
    priority?: string;
    scheduled_date?: string;
    due_date?: string;
    problem_description?: string;
}

export interface ChecklistItem {
    id: string;
    work_order_id: string;
    task_number: number;
    description: string;
    instructions: string | null;
    expected_result: string | null;
    status: string;
    notes: string | null;
}

export const workOrderApi = {
    listAll: async () => {
        const response = await api.get<WorkOrder[]>('/work-orders');
        return response.data;
    },
    listPending: async () => {
        const response = await api.get<WorkOrder[]>('/work-orders/pending');
        return response.data;
    },
    listOverdue: async () => {
        const response = await api.get<WorkOrder[]>('/work-orders/overdue');
        return response.data;
    },
    getDetail: async (id: string) => {
        const response = await api.get<WorkOrder>(`/work-orders/${id}`);
        return response.data;
    },
    create: async (data: CreateWorkOrderRequest) => {
        const response = await api.post<WorkOrder>('/work-orders', data);
        return response.data;
    },
    addChecklistItem: async (woId: string, item: { description: string; instructions?: string }) => {
        const response = await api.post(`/work-orders/${woId}/checklist`, item);
        return response.data;
    },
    getChecklist: async (woId: string) => {
        const response = await api.get<ChecklistItem[]>(`/work-orders/${woId}/checklist`);
        return response.data;
    },
};
