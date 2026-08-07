import { api } from './http';

export interface EntityType {
    id: string;
    name: string;
    module: string;
    storage_strategy: 'TYPED' | 'HYBRID_JSONB' | 'DYNAMIC_JSONB';
    is_custom: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

export interface FieldDefinition {
    id: string;
    entity_type_id: string;
    field_name: string;
    label: string;
    data_type: 'STRING' | 'NUMBER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'JSON';
    is_required: boolean;
    is_readonly: boolean;
    default_value?: string;
    options_json?: any;
}

export interface EntityMetadataBundle {
    entity: EntityType;
    fields: FieldDefinition[];
    layout: any;
}

export const metadataApi = {
    registerEntity: async (payload: { name: string; module: string; storage_strategy: string; is_custom: boolean }) => {
        const res = await api.post('/metadata/', payload);
        return res.data;
    },

    getEntityBundle: async (entityName: string): Promise<EntityMetadataBundle> => {
        const res = await api.get(`/metadata/${entityName}`);
        return res.data;
    },

    addCustomField: async (entityName: string, payload: { field_name: string; label: string; data_type: string; is_required: boolean }) => {
        const res = await api.post(`/metadata/${entityName}/fields`, payload);
        return res.data;
    },

    removeCustomField: async (entityName: string, fieldId: string) => {
        const res = await api.delete(`/metadata/${entityName}/fields/${fieldId}`);
        return res.data;
    }
};
