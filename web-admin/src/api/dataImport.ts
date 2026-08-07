import { api } from './http';

export interface DataImport {
    id: string;
    doctype_name: string;
    import_type: 'Insert' | 'Update';
    file_name: string;
    status: 'Pending' | 'Validating' | 'Success' | 'Partial_Failed' | 'Failed';
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
    created_by_user_id: string;
    created_at: string;
    updated_at: string;
}

export interface DataImportLog {
    id: string;
    data_import_id: string;
    row_number: number;
    status: 'Pending' | 'Success' | 'Failed';
    record_identifier?: string;
    messages: string[];
    row_data: Record<string, any>;
    created_at: string;
}

export interface DataImportDetailResponse {
    import_record: DataImport;
    logs: DataImportLog[];
}

export const dataImportApi = {
    listImports: async () => {
        const response = await api.get<DataImport[]>('/data-imports');
        return response.data;
    },

    getImportDetail: async (id: string) => {
        const response = await api.get<DataImportDetailResponse>(`/data-imports/${id}`);
        return response.data;
    },

    generateTemplate: async (payload: {
        doctype_name: string;
        import_type?: 'Insert' | 'Update';
        selected_fields?: string[];
    }) => {
        const response = await api.post('/data-imports/template', payload, {
            responseType: 'blob',
        });
        return response.data;
    },

    uploadImport: async (payload: {
        doctype_name: string;
        import_type: 'Insert' | 'Update';
        file_name: string;
        rows: Record<string, any>[];
    }) => {
        const response = await api.post<DataImport>('/data-imports/upload', payload);
        return response.data;
    },

    validateImport: async (id: string) => {
        const response = await api.post<DataImport>(`/data-imports/${id}/validate`);
        return response.data;
    },

    startImport: async (id: string) => {
        const response = await api.post<DataImport>(`/data-imports/${id}/start`);
        return response.data;
    },

    getFailedRowsUrl: (id: string) => {
        return `/api/data-imports/${id}/failed-rows`;
    },
};
