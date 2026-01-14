import { api } from './client';

export interface TimesheetRequest {
    rental_id: string;
    work_date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM
    end_time?: string;
    operating_hours: number;
    standby_hours?: number;
    breakdown_hours?: number;
    hm_km_start?: number;
    hm_km_end?: number;
    operation_status: 'operating' | 'standby' | 'breakdown';
    work_description?: string;
    checker_notes?: string;
    photos?: string[]; // Array of URL strings
}

export const timesheetApi = {
    create: async (data: TimesheetRequest) => {
        const response = await api.post('/rentals/timesheets', data);
        return response.data;
    },

    // Optional: Get last HM/KM for validation
    getLastLog: async (rentalId: string) => {
        // Implement backend endpoint for this later if needed
    },

    listByRental: async (rentalId: string) => {
        const response = await api.get(`/rentals/${rentalId}/timesheets`);
        return response.data;
    }
};
