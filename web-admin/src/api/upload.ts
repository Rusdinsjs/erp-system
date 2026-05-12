import { api } from './http';

export interface UploadResponse {
    url: string;
    filename: string;
}

export const uploadApi = {
    // Upload a single file
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post<UploadResponse>('/upload', formData);
        return data;
    },
};
