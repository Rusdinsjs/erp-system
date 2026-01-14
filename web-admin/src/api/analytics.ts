import { api } from './client';

export interface AssetROI {
    asset_id: string;
    asset_name: string;
    asset_code: string;

    purchase_price: number;
    purchase_date: string;
    book_value: number;
    accumulated_depreciation: number;

    total_rental_revenue: number;
    billing_count: number;

    maintenance_cost: number;
    parts_cost: number;
    work_order_count: number;

    net_profit: number;
    roi_percentage: number;
    utilization_days: number;
}

export const analyticsApi = {
    getAssetROI: async (assetId: string) => {
        const response = await api.get<AssetROI>(`/analytics/asset/${assetId}/roi`);
        return response.data;
    }
};
