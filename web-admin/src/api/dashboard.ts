import { api } from './http';

export interface DashboardStats {
    assets: {
        total: number;
        by_status: { status: string; count: number }[];
        total_value: number;
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
    category_distribution: {
        category: string;
        count: number;
        value: number;
    }[];
}

export interface RecentActivity {
    entity_type: string;
    entity_id: string;
    action: string;
    description: string;
    user_name?: string;
    created_at: string;
}

export interface DepreciationSummary {
    total_original_cost: number;
    total_accumulated_depreciation: number;
    total_book_value: number;
}

export const dashboardApi = {
    getStats: async () => {
        const response = await api.get<DashboardStats>('/dashboard');
        return response.data;
    },

    getActivities: async () => {
        const response = await api.get<RecentActivity[]>('/dashboard/activity');
        return response.data;
    },

    getDepreciation: async () => {
        const response = await api.get<DepreciationSummary>('/dashboard/depreciation');
        return response.data;
    }
};
