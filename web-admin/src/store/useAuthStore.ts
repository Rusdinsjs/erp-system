import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

import { api } from '../api/client'; // Import API client

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    role_level: number;
    permissions: string[];
    phone?: string;
    avatar_url?: string;
    department?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    login: (token: string, user: Omit<User, 'permissions' | 'role_level'>) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: () => boolean;
    isAdmin: () => boolean;
    hasPermission: (permission: string) => boolean;
    hasRoleLevel: (level: number) => boolean;
}

interface JwtClaims {
    permissions?: string[];
    role_level?: number;
    department?: string;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            login: (token, baseUser) => {
                try {
                    const decoded = jwtDecode<JwtClaims>(token);
                    const permissions = decoded.permissions || [];
                    const role_level = decoded.role_level ?? 5; // Default to Viewer (5)

                    set({
                        token,
                        user: {
                            ...baseUser,
                            permissions,
                            role_level,
                            department: decoded.department,
                        },
                    });
                } catch (e) {
                    console.error("Failed to decode token", e);
                    // Fallback to basic user if decode fails (shouldn't happen with valid token)
                    set({
                        token,
                        user: {
                            ...baseUser,
                            permissions: [],
                            role_level: 5,
                        },
                    });
                }
            },
            logout: () => set({ token: null, user: null }),
            refreshUser: async () => {
                const token = get().token;
                if (!token) return;
                try {
                    // Backend returns ApiResponse<User> = { success, data: User }
                    const res = await api.get<{ success: boolean; data: User }>('/me');
                    const userData = res.data.data;

                    const currentUser = get().user;
                    if (currentUser && userData) {
                        set({
                            user: {
                                ...currentUser,
                                ...userData, // Update name, phone, avatar_url
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to refresh user", e);
                }
            },
            isAuthenticated: () => !!get().token,
            isAdmin: () => {
                const user = get().user;
                return user?.role === 'admin' || user?.role === 'super_admin';
            },
            hasPermission: (permission: string) => {
                const user = get().user;
                if (!user) return false;
                if (user.role === 'super_admin') return true; // Super admin bypass
                return user.permissions.includes(permission);
            },
            hasRoleLevel: (level: number) => {
                const user = get().user;
                if (!user) return false;
                // Lower number = Higher privilege.
                // e.g. Require Level 3 (Supervisor).
                // User is Level 2 (Manager). 2 <= 3 -> True.
                return user.role_level <= level;
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
