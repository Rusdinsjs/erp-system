import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface PermissionGateProps {
    children: ReactNode;
    requiredPermission?: string;
    requiredRole?: string; // Code
    requiredLevel?: number; // Less than or equal to user level (1 is highest)
    fallback?: ReactNode;
}

export function PermissionGate({
    children,
    requiredPermission,
    requiredRole,
    requiredLevel,
    fallback = null
}: PermissionGateProps) {
    const { user, hasPermission, hasRoleLevel } = useAuthStore();

    if (!user) {
        return <>{fallback}</>;
    }

    // Role Level Check
    if (requiredLevel !== undefined) {
        if (!hasRoleLevel(requiredLevel)) {
            return <>{fallback}</>;
        }
    }

    // Role Code Check
    if (requiredRole) {
        if (user.role !== requiredRole && user.role !== 'super_admin') {
            return <>{fallback}</>;
        }
    }

    // Permission Check
    if (requiredPermission) {
        if (!hasPermission(requiredPermission)) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}
