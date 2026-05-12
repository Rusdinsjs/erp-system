import { api } from './client';

export interface VehicleDetails {
    license_plate?: string;
    brand?: string;
    model?: string;
    color?: string;
    vin?: string;
    engine_number?: string;
    fuel_type?: string;
    transmission?: string;
    capacity?: string;
    odometer_last?: number;
    hour_meter?: number;
}

export interface Asset {
    id: string;
    asset_code: string;
    name: string;
    category_id: string;
    location_id?: string;
    department_id?: string;
    assigned_to?: string;
    vendor_id?: string;

    status: string;
    asset_class?: string;
    is_rental?: boolean;

    serial_number?: string;
    brand?: string;
    model?: string;

    vehicle_details?: VehicleDetails;

    // Computed/Joined fields
    category_name?: string;
    location_name?: string;
    department_name?: string;

    // Financial Stats
    total_maintenance_cost?: number;
    total_rental_income?: number;
}

export const assetApi = {
    getAsset: async (id: string) => {
        const response = await api.get<Asset>(`/assets/${id}`);
        return response.data;
    },

    updateLocation: async (id: string, location_id: string) => {
        // Implement when location update endpoint is ready
        // const response = await api.put(\`/assets/${id}/location\`, { location_id });
        // return response.data;
    }
};
