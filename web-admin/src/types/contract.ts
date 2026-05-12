export interface Contract {
    id: string;
    contract_number: string;
    client_id: string;
    client_name?: string;
    start_date: string;
    end_date: string;
    status: 'draft' | 'pending_approval' | 'active' | 'expiring' | 'expired' | 'renewed' | 'terminated' | 'rejected';
    payment_terms: string;
    auto_renew: boolean;
    price_lock: boolean;
    contract_file_url?: string;
    notes?: string;
    current_approval_step: number;
    total_approval_steps: number;
    delegated_to?: string;
    created_at: string;
}

export interface CreateContractRequest {
    client_id: string;
    start_date: string;
    end_date: string;
    template_id?: string;
    payment_terms?: string;
    auto_renew?: boolean;
    price_lock?: boolean;
    notes?: string;
}

export interface UpdateContractRequest {
    start_date?: string;
    end_date?: string;
    status?: string;
    notes?: string;
}

// Document Management Types
export interface ContractDocument {
    id: string;
    contract_id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    version: number;
    is_active: boolean;
    notes?: string;
    uploaded_by?: string;
    uploaded_at: string;
}

export interface ContractPerformance {
    total_rentals: number;
    active_rentals: number;
    total_revenue: number;
    ma: number;
    pa: number;
    ua: number;
    eu: number;
}

import type { Rental } from '../api/rental';

export interface ContractDetail {
    contract: Contract;
    performance: ContractPerformance;
    documents_count: number;
    related_rentals: Rental[];
}

export interface UploadDocumentRequest {
    file: File;
    document_type: string;
    notes?: string;
}


// Approval interfaces
export interface ContractApproval {
    id: string;
    contract_id: string;
    approver_id?: string;
    approver_name?: string;
    action: 'submitted' | 'approved' | 'rejected' | 'delegated';
    notes?: string;
    approval_level?: number;
    delegated_to?: string;
    delegated_to_name?: string;
    created_at: string;
}

export interface ApprovalRequest {
    notes?: string;
}

export interface BulkApprovalRequest {
    ids: string[];
    notes?: string;
}

export interface DelegateApprovalRequest {
    delegated_to: string;
    notes?: string;
}

// Renewal interfaces
export interface RenewalOptions {
    can_extend: boolean;
    can_modify: boolean;
    can_create_new: boolean;
    current_end_date: string;
    suggested_end_date: string;
    expiring_in_days: number;
}

export interface RenewalRequest {
    renewal_type: 'extend' | 'modify' | 'new';
    new_end_date?: string;
    new_start_date?: string;
    notes?: string;
    payment_terms?: string;
    auto_renew?: boolean;
    price_lock?: boolean;
}

export interface RenewalResponse {
    id: string;
    original_contract_id: string;
    new_contract_id?: string;
    renewal_type: string;
    previous_end_date: string;
    new_end_date: string;
    notes?: string;
    renewed_by?: string;
    renewed_at: string;
}

export interface ApprovalWorkflow {
    id: string;
    workflow_name: string;
    entity_type: string;
    approval_levels: number;
    level_1_role?: string;
    level_2_role?: string;
    level_3_role?: string;
    level_4_role?: string;
    level_5_role?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ApprovalWorkflowRequest {
    workflow_name: string;
    entity_type: string;
    approval_levels: number;
    level_1_role?: string;
    level_2_role?: string;
    level_3_role?: string;
    level_4_role?: string;
    level_5_role?: string;
    is_active?: boolean;
}
