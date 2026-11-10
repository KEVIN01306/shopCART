import { api } from './axios.instance';

export interface UploadImageResponse {
    status: string;
    message: string;
    data: {
        url: string;
        key: string;
        originalName: string;
        size: number;
        mimeType: string;
    };
}

export const uploadImageToR2 = async (file: File): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadImageResponse>('/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return {
        url: response.data.data.url,
        key: response.data.data.key,
    };
};
