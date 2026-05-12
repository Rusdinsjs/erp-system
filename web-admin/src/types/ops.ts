// Removed unused import

export interface WorkOrder {
    id: string;
    wo_number: string;
    asset_id: string;
    wo_type: string;
    priority: string;
    status: string;
    scheduled_date?: string;
    due_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    assigned_technician?: string;
    estimated_cost?: number;
    actual_cost?: number;
    parts_cost?: number;
    labor_cost?: number;
    problem_description?: string;
    work_performed?: string;
    recommendations?: string;
    safety_requirements?: string[];
    created_at: string;
    updated_at: string;
    asset_name?: string;
    expense_type?: string;
    labor_expense_type?: string;
    expense_id?: string;
    technician_signoff?: string;
    supervisor_signoff?: string;
    customer_signoff?: string;
}

export interface ChecklistItem {
    id: string;
    work_order_id: string;
    task_number: number;
    description: string;
    status: string;
    completed_by?: string;
    completed_at?: string;
    photos?: string[];
}

export interface WorkOrderPart {
    id: string;
    work_order_id: string;
    part_name: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    added_at: string;
    expense_type?: string;
    inventory_item_id?: string;
}

export interface MaintenanceTemplate {
    id: string;
    name: string;
    description: string | null;
    asset_category_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TemplateTask {
    id: string;
    template_id: string;
    task_number: number;
    description: string;
    instructions: string | null;
    expected_result: string | null;
}

export interface MaintenanceTemplateWithTasks extends MaintenanceTemplate {
    tasks: TemplateTask[];
}

export interface WorkOrderAnalyticsData {
    status_counts: { status: string; count: number; }[];
    type_counts: { wo_type: string; count: number; }[];
    cost_trend: { month: string; total_cost: number; wo_count: number; }[];
}

export interface FuelRecord {
    id: string;
    asset_id: string;
    date: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    odometer?: number;
    location?: string;
    vendor_name?: string;
    receipt_url?: string;
    notes?: string;
}

export interface Rental {
    id: string;
    asset_id: string;
    client_id: string;
    start_date: string;
    end_date?: string;
    daily_rate: number;
    status: string;
    asset_name?: string;
    client_name?: string;
}

export interface AddTaskRequest {
    task_number: number;
    description: string;
}

export interface AddPartRequest {
    part_name: string;
    quantity: number;
    unit_cost: number;
    expense_type: 'OPEX' | 'CAPEX';
    inventory_item_id?: string;
}
