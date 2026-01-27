import { api } from './http';


export interface WorkOrder {
    id: string;
    wo_number: string;
    asset_id: string;
    wo_type: string;
    priority: string;
    status: string;
    scheduled_date?: string;
    due_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    assigned_technician?: string;
    estimated_cost?: number; // In Decimal from backend, number in JS
    actual_cost?: number;
    parts_cost?: number;
    labor_cost?: number;
    problem_description?: string;
    work_performed?: string;
    recommendations?: string;
    safety_requirements?: string[];
    created_at: string;
    updated_at: string;
    asset_name?: string;
    expense_type?: string;
    labor_expense_type?: string;
    expense_id?: string;
    opex_expense_id?: string;
    capex_expense_id?: string;
    customer_signoff?: string;
    technician_signoff?: string;
    supervisor_signoff?: string;
}

export interface ChecklistItem {
    id: string;
    work_order_id: string;
    task_number: number;
    description: string;
    status: string; // pending, completed
    completed_by?: string;
    completed_at?: string;
    photos?: string[];
}

export interface WorkOrderPart {
    id: string;
    work_order_id: string;
    part_name: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    added_at: string;
    expense_type?: string;
    inventory_item_id?: string;
}

export interface AddTaskRequest {
    task_number: number;
    description: string;
}

export interface AddPartRequest {
    part_name: string;
    quantity: number;
    unit_cost: number;
    expense_type: 'OPEX' | 'CAPEX';
    inventory_item_id?: string;
}

export interface MaintenanceTemplate {
    id: string;
    name: string;
    description: string | null;
    asset_category_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TemplateTask {
    id: string;
    template_id: string;
    task_number: number;
    description: string;
    instructions: string | null;
    expected_result: string | null;
}

export interface MaintenanceTemplateWithTasks extends MaintenanceTemplate {
    tasks: TemplateTask[];
}

// Copied generic ApiResponse from maintenance.ts before deletion
export interface ApiResponse<T> {
    success: boolean;
    message: string | null;
    data: T;
}

export const workOrderApi = {
    get: async (id: string): Promise<WorkOrder> => {
        const response = await api.get(`/work-orders/${id}`);
        // Backend returns the object directly
        return response.data;
    },

    // Tasks
    getTasks: async (id: string): Promise<ChecklistItem[]> => {
        const response = await api.get(`/work-orders/${id}/tasks`);
        return response.data;
    },
    addTask: async (id: string, data: AddTaskRequest): Promise<ChecklistItem> => {
        const response = await api.post(`/work-orders/${id}/tasks`, data);
        return response.data;
    },
    updateTask: async (id: string, taskId: string, data: { description: string }): Promise<ApiResponse<boolean>> => {
        const response = await api.put(`/work-orders/${id}/tasks/${taskId}`, data);
        return response.data;
    },
    removeTask: async (id: string, taskId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/work-orders/${id}/tasks/${taskId}`);
        return response.data;
    },
    updateTaskPhotos: async (id: string, taskId: string, photos: string[]): Promise<ApiResponse<boolean>> => {
        const response = await api.put(`/work-orders/${id}/tasks/${taskId}/photos`, { photos });
        return response.data;
    },
    applyTemplate: async (id: string, templateId: string): Promise<ApiResponse<number>> => {
        const response = await api.post(`/work-orders/${id}/apply-template/${templateId}`);
        return response.data;
    },

    getTemplates: async (): Promise<MaintenanceTemplate[]> => {
        const response = await api.get('/maintenance-templates');
        return response.data;
    },
    getTemplate: async (id: string): Promise<MaintenanceTemplateWithTasks> => {
        const response = await api.get(`/maintenance-templates/${id}`);
        return response.data;
    },
    createTemplate: async (data: Partial<MaintenanceTemplate>): Promise<MaintenanceTemplate> => {
        const response = await api.post('/maintenance-templates', data);
        return response.data;
    },
    deleteTemplate: async (id: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/maintenance-templates/${id}`);
        return response.data;
    },
    addTemplateTask: async (id: string, data: { task_number: number, description: string }): Promise<TemplateTask> => {
        const response = await api.post(`/maintenance-templates/${id}/tasks`, data);
        return response.data;
    },
    deleteTemplateTask: async (templateId: string, taskId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/maintenance-templates/${templateId}/tasks/${taskId}`);
        return response.data;
    },

    // Parts
    getParts: async (id: string): Promise<WorkOrderPart[]> => {
        const response = await api.get(`/work-orders/${id}/parts`);
        return response.data;
    },
    addPart: async (id: string, data: AddPartRequest): Promise<WorkOrderPart> => {
        const response = await api.post(`/work-orders/${id}/parts`, data);
        return response.data;
    },
    updatePart: async (id: string, partId: string, data: AddPartRequest): Promise<WorkOrderPart> => {
        const response = await api.put(`/work-orders/${id}/parts/${partId}`, data);
        return response.data;
    },
    removePart: async (id: string, partId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/work-orders/${id}/parts/${partId}`);
        return response.data;
    },

    // List & CRUD
    list: async (params?: any): Promise<WorkOrder[]> => {
        const response = await api.get('/work-orders', { params });
        return response.data;
    },
    listByAsset: async (assetId: string): Promise<WorkOrder[]> => {
        const response = await api.get(`/work-orders`, { params: { asset_id: assetId } });
        return response.data;
    },
    listPending: async (): Promise<WorkOrder[]> => {
        const response = await api.get('/work-orders/pending');
        return response.data;
    },
    listOverdue: async (): Promise<WorkOrder[]> => {
        const response = await api.get('/work-orders/overdue');
        return response.data;
    },
    create: async (data: any): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post('/work-orders', data);
        return response.data;
    },
    // Note: Work Order update is usually done via specific actions (approve, assign, etc)
    // but for compatibility we might need a general update if backend supports it.
    // Checking backend... `update_work_order` isn't explicit in the huge handler file content I saw earlier,
    // usually it's state based. BUT we need to create it if it doesn't exist or use specific routes.
    // For now let's assume specific actions are the way, but we might need a general 'edit details' endpoint later.
    delete: async (id: string): Promise<ApiResponse<WorkOrder>> => {
        // NOTE: Work Order usually has 'cancel' instead of delete, but admin might need delete.
        // Backend `delete_maintenance` existed. WORK ORDER handler didn't show explicit delete in the previous view.
        // Let's implement cancel as the main 'delete' action for now or check if we need to add delete to backend.
        // Work Order Cancel:
        return workOrderApi.cancel(id);
    },
    cancel: async (id: string): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/cancel`);
        return response.data;
    },

    // Actions
    approve: async (id: string): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/approve`);
        return response.data;
    },
    assign: async (id: string, technicianId: string): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/assign/${technicianId}`);
        return response.data;
    },
    start: async (id: string): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/start`);
        return response.data;
    },
    complete: async (id: string, data: { work_performed: string }): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/complete`, data);
        return response.data;
    },
    verify: async (id: string, data: { labor_cost: number }): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/verify`, data);
        return response.data;
    },
    finalize: async (
        id: string,
        data: {
            labor_expense_type: string;
            parts?: { part_id: string; expense_type: string }[];
        }
    ): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/finalize`, data);
        return response.data;
    },
    submitSignoff: async (
        id: string,
        data: { role: string; signature_url: string }
    ): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/signoff`, data);
        return response.data;
    },

    getAnalytics: async () => {
        const response = await api.get<{ data: WorkOrderAnalyticsData }>('/work-orders/analytics');
        return response.data.data;
    }
};

export interface WorkOrderAnalyticsData {
    status_counts: {
        status: string;
        count: number;
    }[];
    type_counts: {
        wo_type: string;
        count: number;
    }[];
    cost_trend: {
        month: string;
        total_cost: number;
        wo_count: number;
    }[];
}
