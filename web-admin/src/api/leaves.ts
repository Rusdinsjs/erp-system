import { api as client } from './http';

export interface LeaveRequest {
    id: string;
    employee_id: string;
    employee_name?: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
}

export interface CreateLeavePayload {
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
}

export const getMyLeaves = async (): Promise<LeaveRequest[]> => {
    const response = await client.get('/hrd/leaves/my');
    return response.data;
};

export const getPendingLeaves = async (): Promise<LeaveRequest[]> => {
    const response = await client.get('/hrd/leaves/pending');
    return response.data;
};

export const requestLeave = async (data: CreateLeavePayload): Promise<LeaveRequest> => {
    const response = await client.post('/hrd/leaves', data);
    return response.data;
};

export const approveLeave = async (id: string): Promise<LeaveRequest> => {
    const response = await client.post(`/hrd/leaves/${id}/approve`);
    return response.data;
};

export const rejectLeave = async (id: string, reason: string): Promise<LeaveRequest> => {
    const response = await client.post(`/hrd/leaves/${id}/reject`, { reason });
    return response.data;
};
