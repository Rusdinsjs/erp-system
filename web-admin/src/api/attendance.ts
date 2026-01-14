import { api } from './client';

export interface CheckInRequest {
    latitude: number;
    longitude: number;
    device_info: string;
    photo_url?: string;
    notes?: string;
}

export interface CheckOutRequest {
    latitude: number;
    longitude: number;
    device_info: string;
    photo_url?: string;
    notes?: string;
}

export interface AttendanceRecord {
    id: string;
    employee_id: string;
    check_in_time: string;
    check_out_time?: string;
    check_in_status: string;
    check_out_status?: string;
    duration_minutes?: number;
    employee_name?: string; // For admin view
    photo_url?: string;
}

export interface TodayStatus {
    has_checked_in: boolean;
    has_checked_out: boolean;
    current_session?: AttendanceRecord;
    schedule_in: string;
    schedule_out: string;
}

export const attendanceApi = {
    getTodayStatus: async () => {
        const response = await api.get<{ data: TodayStatus }>('/hrd/attendance/today');
        return response.data;
    },

    checkIn: async (data: CheckInRequest) => {
        const response = await api.post<{ data: AttendanceRecord }>('/hrd/attendance/check-in', data);
        return response.data;
    },

    checkOut: async (data: CheckOutRequest) => {
        const response = await api.post<{ data: AttendanceRecord }>('/hrd/attendance/check-out', data);
        return response.data;
    },

    getMyHistory: async () => {
        const response = await api.get<{ data: AttendanceRecord[] }>('/hrd/attendance/history');
        return response.data;
    },

    getAllToday: async () => {
        const response = await api.get<{ data: AttendanceRecord[] }>('/hrd/attendance/all-today');
        return response.data;
    },
};
