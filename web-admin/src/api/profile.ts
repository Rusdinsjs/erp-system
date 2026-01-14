import { api } from "./client";
import type { User } from "../store/useAuthStore";

export interface UpdateProfileRequest {
    name: string;
    phone?: string;
}

export interface ChangePasswordRequest {
    old_password?: string;
    new_password?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export const profileApi = {
    getProfile: async (): Promise<User> => {
        const response = await api.get<ApiResponse<User>>("/me");
        return response.data.data;
    },

    updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
        const response = await api.put<ApiResponse<User>>("/me", data);
        return response.data.data;
    },

    changePassword: async (data: ChangePasswordRequest): Promise<void> => {
        await api.put("/me/password", data);
    },

    uploadAvatar: async (file: File): Promise<User> => {
        const formData = new FormData();
        formData.append("avatar", file);
        const response = await api.post<ApiResponse<User>>("/me/avatar", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data.data;
    },
};

