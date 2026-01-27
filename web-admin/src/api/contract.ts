import { api } from './http';
import type {
    Contract,
    CreateContractRequest,
    UpdateContractRequest,
    ContractDetail,
    ContractDocument,
    UploadDocumentRequest,
    ApprovalRequest,
    BulkApprovalRequest,
    DelegateApprovalRequest,
    ContractApproval,
    RenewalOptions,
    RenewalRequest,
    RenewalResponse
} from '../types/contract';

export const contractApi = {
    list: async () => {
        const { data } = await api.get('/contracts');
        return data;
    },

    listExpiring: async () => {
        const { data } = await api.get('/contracts?expiring_soon=true');
        return data;
    },

    getPendingCount: async (): Promise<{ count: number }> => {
        const { data } = await api.get('/contracts/pending-count');
        return data;
    },

    get: async (id: string) => {
        const { data } = await api.get(`/contracts/${id}`);
        return data;
    },

    getDetails: async (id: string): Promise<ContractDetail> => {
        const { data } = await api.get(`/contracts/${id}/details`);
        return data.data;
    },

    create: async (contract: CreateContractRequest) => {
        const { data } = await api.post('/contracts', contract);
        return data;
    },

    update: async (id: string, contract: UpdateContractRequest) => {
        const { data } = await api.patch(`/contracts/${id}`, contract);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await api.delete(`/contracts/${id}`);
        return data;
    },

    bulkApprove: async (request: BulkApprovalRequest): Promise<Contract[]> => {
        const { data } = await api.post('/contracts/bulk-approve', request);
        return data;
    },

    bulkReject: async (request: BulkApprovalRequest): Promise<Contract[]> => {
        const { data } = await api.post('/contracts/bulk-reject', request);
        return data;
    },

    // Document Management
    uploadDocument: async (contractId: string, request: UploadDocumentRequest): Promise<ContractDocument> => {
        const formData = new FormData();
        formData.append('file', request.file);
        formData.append('document_type', request.document_type);
        if (request.notes) {
            formData.append('notes', request.notes);
        }

        const { data } = await api.post(`/contracts/${contractId}/documents`, formData);
        return data.data;
    },

    listDocuments: async (contractId: string): Promise<ContractDocument[]> => {
        const { data } = await api.get(`/contracts/${contractId}/documents`);
        return data.data;
    },

    downloadDocument: async (documentId: string): Promise<Blob> => {
        const { data } = await api.get(`/contracts/documents/${documentId}/download`, {
            responseType: 'blob',
        });
        return data;
    },

    deleteDocument: async (documentId: string): Promise<void> => {
        await api.delete(`/contracts/documents/${documentId}`);
    },

    // Approval methods
    submitForApproval: async (contractId: string): Promise<Contract> => {
        const { data } = await api.post(`/contracts/${contractId}/submit-approval`);
        return data;
    },

    approveContract: async (contractId: string, request: ApprovalRequest): Promise<Contract> => {
        const { data } = await api.post(`/contracts/${contractId}/approve`, request);
        return data;
    },

    rejectContract: async (contractId: string, request: ApprovalRequest): Promise<Contract> => {
        const { data } = await api.post(`/contracts/${contractId}/reject`, request);
        return data;
    },

    delegate: async (contractId: string, request: DelegateApprovalRequest): Promise<Contract> => {
        const { data } = await api.post(`/contracts/${contractId}/delegate`, request);
        return data;
    },

    getApprovalHistory: async (contractId: string): Promise<ContractApproval[]> => {
        const { data } = await api.get(`/contracts/${contractId}/approval-history`);
        return data;
    },

    getRenewalOptions: async (contractId: string): Promise<RenewalOptions> => {
        const { data } = await api.get(`/contracts/${contractId}/renewal-options`);
        return data;
    },

    renew: async (contractId: string, request: RenewalRequest): Promise<RenewalResponse> => {
        const { data } = await api.post(`/contracts/${contractId}/renew`, request);
        return data;
    },

    listRenewals: async (contractId: string): Promise<RenewalResponse[]> => {
        const { data } = await api.get(`/contracts/${contractId}/renewals`);
        return data;
    },
};
