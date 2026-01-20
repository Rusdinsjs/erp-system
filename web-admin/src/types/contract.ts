export interface Contract {
    id: string;
    contract_number: string;
    client_id: string;
    client_name?: string;
    start_date: string;
    end_date: string;
    status: 'draft' | 'pending_approval' | 'active' | 'expiring' | 'expired' | 'renewed' | 'terminated';
    payment_terms: string;
    auto_renew: boolean;
    price_lock: boolean;
    contract_file_url?: string;
    notes?: string;
    created_at: string;
}

export interface CreateContractRequest {
    client_id: string;
    start_date: string;
    end_date: string;
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
