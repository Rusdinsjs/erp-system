import { api as client } from './client';

export interface DashboardStats {
    assets: {
        total: number;
        by_status: { status: string; count: number }[];
        total_value: number; // or string depending on serde settings
    };
    maintenance: {
        pending: number;
        overdue: number;
    };
    loans: {
        active: number;
        overdue: number;
        pending_approval: number;
    };
    alerts: {
        active: number;
        critical: number;
    };
}

export interface RecentActivity {
    entity_type: string;
    description: string;
    action: string;
    created_at: string;
}

export const dashboardApi = {
    getStats: async () => {
        const response = await client.get<DashboardStats>('/dashboard');
        return response.data;
    },
    getActivity: async () => {
        const response = await client.get<RecentActivity[]>('/dashboard/activity');
        return response.data;
    }
};
