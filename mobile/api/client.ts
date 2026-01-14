import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri; // Get the IP address of the machine running Expo
const localhost = debuggerHost?.split(':')[0] || '10.0.2.2'; // Fallback to Android Emulator localhost

export const API_URL = `http://${localhost}:8080/api`;

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            await SecureStore.deleteItemAsync('auth_token');
            // We can't directly redirect here easily without navigation ref, 
            // but the AuthStore state change should trigger it.
        }
        return Promise.reject(error);
    }
);
