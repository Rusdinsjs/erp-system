export interface ContractTemplate {
    id: string;
    name: string;
    description?: string;
    header_content?: string;
    body_content: string;
    footer_content?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreateContractTemplateRequest {
    name: string;
    description?: string;
    header_content?: string;
    body_content: string;
    footer_content?: string;
}

export interface UpdateContractTemplateRequest {
    name?: string;
    description?: string;
    header_content?: string;
    body_content?: string;
    footer_content?: string;
    is_active?: boolean;
}
