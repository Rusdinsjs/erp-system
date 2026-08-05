export interface ApprovalEntityType {
    id?: string;
    value: string;           // key di DB
    label: string;           // label di UI
    icon: string | null;     // lucide icon name
    color: string | null;    // tailwind color class
    description: string | null; // deskripsi singkat
    backend_module?: string | null; // modul backend yang handle
    backendModule?: string | null;
    is_active?: boolean;
    is_system?: boolean;
}

export const APPROVAL_ENTITY_TYPES: ApprovalEntityType[] = [
    {
        value: 'asset',
        label: 'Asset',
        icon: 'Box',
        color: 'text-green-400',
        description: 'Asset creation, sale, and disposal',
        backendModule: 'asset_service',
    },
    {
        value: 'work_order',
        label: 'Work Order',
        icon: 'Wrench',
        color: 'text-blue-400',
        description: 'Maintenance work order creation',
        backendModule: 'work_order_service',
    },
    {
        value: 'loan',
        label: 'Loan',
        icon: 'ArrowLeftRight',
        color: 'text-cyan-400',
        description: 'Asset loan requests',
        backendModule: 'loan_service',
    },
    {
        value: 'lifecycle_transition',
        label: 'Lifecycle Transition',
        icon: 'RefreshCw',
        color: 'text-violet-400',
        description: 'Asset state changes (deploy, retire, etc)',
        backendModule: 'asset_service',
    },
    {
        value: 'rental_request',
        label: 'Rental Request',
        icon: 'Truck',
        color: 'text-orange-400',
        description: 'New rental order requests',
        backendModule: 'rental_service',
    },
    {
        value: 'timesheet_verification',
        label: 'Timesheet',
        icon: 'ClipboardCheck',
        color: 'text-teal-400',
        description: 'Timesheet verification requests',
        backendModule: 'timesheet_service',
    },
    {
        value: 'conversion_request',
        label: 'Conversion',
        icon: 'ArrowLeftRight',
        color: 'text-purple-400',
        description: 'Unit conversion requests',
        backendModule: 'inventory_service',
    },
    {
        value: 'fuel_request',
        label: 'Fuel Request',
        icon: 'Fuel',
        color: 'text-yellow-400',
        description: 'Fuel logging requests',
        backendModule: 'fuel_service',
    },
    {
        value: 'tax_renewal',
        label: 'Tax Renewal',
        icon: 'FileText',
        color: 'text-rose-400',
        description: 'Tax/KIR/STNK renewal requests',
        backendModule: 'tax_renewal_service',
    },
    {
        value: 'contract',
        label: 'Contract',
        icon: 'FileText',
        color: 'text-cyan-400',
        description: 'Contract creation, renewal, and amendments',
        backendModule: 'contract_service',
    },
    {
        value: 'purchase_order',
        label: 'Purchase Order',
        icon: 'ShoppingCart',
        color: 'text-indigo-400',
        description: 'Purchase order approval requests',
        backendModule: 'purchase_service',
    },
    {
        value: 'expense_report',
        label: 'Expense Report',
        icon: 'Receipt',
        color: 'text-rose-400',
        description: 'Expense reimbursement approval requests',
        backendModule: 'finance_service',
    },
    {
        value: 'vendor_registration',
        label: 'Vendor Registration',
        icon: 'UserCheck',
        color: 'text-teal-400',
        description: 'New vendor registration approval',
        backendModule: 'vendor_service',
    },
    {
        value: 'leave_request',
        label: 'Leave Request',
        icon: 'Calendar',
        color: 'text-amber-400',
        description: 'Employee leave approval requests',
        backendModule: 'employee_service',
    },
    {
        value: 'overtime_request',
        label: 'Overtime Request',
        icon: 'Clock',
        color: 'text-yellow-400',
        description: 'Employee overtime approval requests',
        backendModule: 'employee_service',
    },
];
