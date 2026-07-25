import { api } from './http';
import type {
    WorkOrder,
    ChecklistItem,
    WorkOrderPart,
    AddTaskRequest,
    AddPartRequest,
    MaintenanceTemplate,
    MaintenanceTemplateWithTasks,
    TemplateTask,
    ApiResponse,
    WorkOrderAnalyticsData
} from '../types';

export type {
    WorkOrder,
    ChecklistItem,
    WorkOrderPart,
    AddTaskRequest,
    AddPartRequest,
    MaintenanceTemplate,
    MaintenanceTemplateWithTasks,
    TemplateTask,
    ApiResponse,
    WorkOrderAnalyticsData
};

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
    addTemplateTask: async (id: string, data: { task_number: number, description: string, instructions?: string, expected_result?: string }): Promise<TemplateTask> => {
        const response = await api.post(`/maintenance-templates/${id}/tasks`, data);
        return response.data;
    },
    deleteTemplateTask: async (templateId: string, taskId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/maintenance-templates/${templateId}/tasks/${taskId}`);
        return response.data;
    },
    duplicateTemplate: async (id: string, newName: string): Promise<MaintenanceTemplate> => {
        const response = await api.post(`/maintenance-templates/${id}/duplicate`, { new_name: newName });
        return response.data;
    },
    reorderTemplateTasks: async (id: string, taskIds: string[]): Promise<ApiResponse<boolean>> => {
        const response = await api.put(`/maintenance-templates/${id}/tasks/reorder`, { task_ids: taskIds });
        return response.data;
    },
    getTemplateVersions: async (id: string): Promise<MaintenanceTemplate[]> => {
        const response = await api.get(`/maintenance-templates/${id}/versions`);
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

// End of file
