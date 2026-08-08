import { api } from './http';

export interface CompanyAmendmentDeed {
    id?: string;
    company_id?: string;
    deed_no: string;
    deed_date?: string;
    notary_name?: string;
    approval_no?: string;
    description?: string;
}

export interface Company {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    legal_name?: string;
    tax_id?: string;
    base_currency: string;
    country: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    domain?: string;
    website?: string;
    parent_company_id?: string;
    parent_company_name?: string;
    incorporation_date?: string;
    registration_no?: string;
    // Akta Pendirian
    establishment_deed_no?: string;
    establishment_deed_date?: string;
    establishment_notary_name?: string;
    establishment_approval_no?: string;
    // Akta Perubahan (Multiple)
    amendment_deeds?: CompanyAmendmentDeed[];
    // Account defaults
    default_bank_account_id?: string;
    default_cash_account_id?: string;
    default_income_account_id?: string;
    default_expense_account_id?: string;
    default_receivable_account_id?: string;
    default_payable_account_id?: string;
    fiscal_year_start_month?: number;
    is_group: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
}

export interface CompanyTreeNode {
    id: string;
    code: string;
    name: string;
    legal_name?: string;
    tax_id?: string;
    is_group: boolean;
    status: string;
    children: CompanyTreeNode[];
}

export interface CompanyPayload {
    code: string;
    name: string;
    legal_name?: string;
    tax_id?: string;
    base_currency?: string;
    country?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    domain?: string;
    website?: string;
    parent_company_id?: string;
    incorporation_date?: string;
    registration_no?: string;
    // Akta Pendirian
    establishment_deed_no?: string;
    establishment_deed_date?: string;
    establishment_notary_name?: string;
    establishment_approval_no?: string;
    // Akta Perubahan (Multiple)
    amendment_deeds?: CompanyAmendmentDeed[];
    fiscal_year_start_month?: number;
    is_group?: boolean;
    status?: 'ACTIVE' | 'INACTIVE';
}

export const fetchCompanies = async (params?: { search?: string; status?: string; is_group?: boolean }) => {
    const res = await api.get('/companies', { params });
    return res.data;
};

export const fetchCompanyTree = async () => {
    const res = await api.get('/companies/tree');
    return res.data;
};

export const fetchCompanyById = async (id: string) => {
    const res = await api.get(`/companies/${id}`);
    return res.data;
};

export const createCompany = async (payload: CompanyPayload) => {
    const res = await api.post('/companies', payload);
    return res.data;
};

export const updateCompany = async (id: string, payload: CompanyPayload) => {
    const res = await api.put(`/companies/${id}`, payload);
    return res.data;
};

export const deleteCompany = async (id: string) => {
    const res = await api.delete(`/companies/${id}`);
    return res.data;
};
