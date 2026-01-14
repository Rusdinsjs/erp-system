import axios from 'axios';
import { API_URL } from './client';

export interface UploadResponse {
    id: string;
    url: string;
    original_name: string;
    content_type: string;
    size: number;
}

export const uploadApi = {
    uploadImage: async (uri: string): Promise<UploadResponse> => {
        const formData = new FormData();

        // Extract name and type securely
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // Append file
        formData.append('file', {
            uri,
            name: filename,
            type,
        } as any);

        console.log('Uploading:', { uri, filename, type, url: `${API_URL}/upload` });

        // Use a fresh instance to avoid 'application/json' default header
        // DO NOT set 'Content-Type' manually; let Axios/Native handle boundary generation.
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                'Accept': 'application/json',
            },
        });

        return response.data;
    }
};
