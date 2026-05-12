import { api } from './http';

export interface MaintenanceSchedule {
    id: string;
    asset_id: string;
    asset_name?: string;
    title: string;
    description?: string;
    interval_type: 'time' | 'usage';
    interval_value: number;
    interval_unit: 'days' | 'months' | 'years' | 'km' | 'hours' | 'weeks';
    is_active: boolean;
    last_run_date?: string;
    last_run_reading?: number;
    next_run_date?: string;
    next_run_reading?: number;
    created_at: string;
}

export interface CreateMaintenanceScheduleRequest {
    asset_id: string;
    title: string;
    description?: string;
    interval_type: 'time' | 'usage';
    interval_value: number;
    interval_unit: string;
    start_date?: string;
}

export const maintenanceApi = {
    listSchedules: async () => {
        const response = await api.get('/maintenance/schedules');
        return response.data.data;
    },

    createSchedule: async (data: CreateMaintenanceScheduleRequest) => {
        const response = await api.post('/maintenance/schedules', data);
        return response.data.data;
    },

    toggleSchedule: async (id: string, is_active: boolean) => {
        const response = await api.put(`/maintenance/schedules/${id}/toggle`, { is_active });
        return response.data.data;
    },

    runSchedule: async (id: string) => {
        const response = await api.post(`/maintenance/schedules/${id}/run`, {});
        return response.data.data;
    }
};
