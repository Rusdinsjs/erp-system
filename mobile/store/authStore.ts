import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { router } from 'expo-router';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,

    login: async (token, user) => {
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(user));
        set({ token, user });
        router.replace('/(tabs)');
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_data');
        set({ token: null, user: null });
        router.replace('/(auth)/login');
    },

    checkAuth: async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const userData = await SecureStore.getItemAsync('user_data');

            if (token && userData) {
                set({ token, user: JSON.parse(userData), isLoading: false });
                router.replace('/(tabs)');
            } else {
                set({ token: null, user: null, isLoading: false });
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            set({ token: null, user: null, isLoading: false });
        }
    },
}));
