// Removed unused import

export interface VehicleDetails {
    license_plate?: string;
    brand?: string;
    model?: string;
    color?: string;
    vin?: string;
    engine_number?: string;
    bpkb_number?: string;
    stnk_expiry?: string;
    kir_expiry?: string;
    tax_expiry?: string;
    heavy_equipment_tax_expiry?: string;
    lapor_tiba_expiry?: string;
    fuel_type?: string;
    transmission?: string;
    capacity?: string;
    odometer_last?: number;
    invoice_number?: string;
}

export interface LandDetails {
    asset_id?: string;
    certificate_number?: string;
    land_area?: number;
    address?: string;
    zoning?: string;
    rights_status?: string;
    rights_expiry?: string;
    pbb_number?: string;
    njop_value?: number;
    gps_coordinates?: string;
    boundaries?: string;
}

export interface BuildingDetails {
    asset_id?: string;
    land_asset_id?: string;
    building_area?: number;
    floor_count?: number;
    build_year?: number;
    renovation_year?: number;
    construction_type?: string;
    building_function?: string;
    capacity?: number;
    imb_number?: string;
    slf_number?: string;
    slf_expiry?: string;
}

export interface HeavyEquipmentDetails {
    asset_id?: string;
    equipment_type?: string;
    operating_weight?: number;
    capacity?: string;
    engine_model?: string;
    hour_meter?: number;
    certification_number?: string;
    certification_expiry?: string;
}

export interface MachineDetails {
    asset_id?: string;
    machine_type?: string;
    technical_specs?: string;
    installation_year?: number;
    operating_hours?: number;
    energy_source?: string;
}

export interface InventoryDetails {
    asset_id?: string;
    warranty_expiry?: string;
    os?: string;
    mac_address?: string;
    processor?: string;
    ram_gb?: number;
    storage_gb?: number;
}

export interface FurnitureDetails {
    asset_id?: string;
    material?: string;
    width_cm?: number;
    height_cm?: number;
    depth_cm?: number;
    capacity?: number;
    color?: string;
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
    condition_id?: number;
    is_rental?: boolean;
    is_fuel?: boolean;
    is_loan?: boolean;
    serial_number?: string;
    brand?: string;
    model?: string;
    year_manufacture?: number;
    description?: string;
    acquisition_method?: string;
    funding_source?: string;
    specifications?: any;
    vehicle_details?: VehicleDetails;
    land_details?: LandDetails;
    building_details?: BuildingDetails;
    heavy_equipment_details?: HeavyEquipmentDetails;
    machine_details?: MachineDetails;
    inventory_details?: InventoryDetails;
    furniture_details?: FurnitureDetails;
    purchase_date?: string;
    purchase_price?: number;
    currency_id?: number;
    unit_id?: number;
    quantity?: number;
    residual_value?: number;
    useful_life_months?: number;
    notes?: string;
    qr_code_url?: string;
    created_at?: string;
    updated_at?: string;
    category_name?: string;
    location_name?: string;
    department_name?: string;
    department_manager_name?: string;
    assigned_to_name?: string;
    vendor_name?: string;
    total_maintenance_cost?: number;
    total_rental_income?: number;
    photos?: {
        front?: string;
        back?: string;
        left?: string;
        right?: string;
        [key: string]: string | undefined;
    };
    version: number;
}

export interface Category {
    id: string;
    code: string;
    name: string;
    description?: string;
    parent_id?: string;
    created_at: string;
    updated_at: string;
}

export interface AssetDocument {
    id: string;
    asset_id: string;
    name: string;
    type: string;
    file_path: string;
    mime_type?: string;
    size_bytes?: number;
    expiry_date?: string;
    notes?: string;
    uploaded_by?: string;
    created_at?: string;
}

export interface CreateAssetDocumentRequest {
    name: string;
    type: string;
    file_path: string;
    mime_type?: string;
    size_bytes?: number;
    expiry_date?: string;
    notes?: string;
}

export interface SellAssetRequest {
    sale_price: number;
    sale_date: string;
    sold_to: string;
    notes?: string;
}

export interface AssetExpenseItem {
    id: string;
    description: string;
    amount: number;
}

export interface AssetExpenseItemRequest {
    description: string;
    amount: number;
}

export interface AssetExpense {
    id: string;
    asset_id: string;
    description: string;
    amount: number;
    date: string;
    vendor_name?: string;
    invoice_number?: string;
    proof_url?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    expense_type: 'OPEX' | 'CAPEX';
    requested_by: string;
    created_at: string;
    updated_at: string;
    items?: AssetExpenseItem[];
}

export interface CreateAssetExpenseRequest {
    description: string;
    items: AssetExpenseItemRequest[];
    date: string;
    vendor_name?: string;
    invoice_number?: string;
    proof_url?: string;
    expense_type?: 'OPEX' | 'CAPEX';
}

export interface BulkUpdateAssetRequest {
    asset_ids: string[];
    status?: string;
    location_id?: string;
    department?: string;
    department_id?: string;
}

export interface UpdateAssetRequest extends Partial<CreateAssetRequest> {
    version?: number;
}

export interface CreateAssetRequest extends Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'status'> {
    status?: string;
    vehicle_details?: VehicleDetails;
    land_details?: LandDetails;
    building_details?: BuildingDetails;
    heavy_equipment_details?: HeavyEquipmentDetails;
    machine_details?: MachineDetails;
    inventory_details?: InventoryDetails;
    furniture_details?: FurnitureDetails;
}

export interface AssetSearchParams {
    query?: string;
    category_id?: string;
    location_id?: string;
    department?: string;
    status?: string;
    is_rental?: boolean;
    is_fuel?: boolean;
    is_loan?: boolean;
    page: number;
    per_page: number;
    exact_match?: boolean;
    sort_by?: string;
    sort_order?: string;
}
