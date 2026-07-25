import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface PermissionGateProps {
    children: ReactNode;
    resource?: string;
    action?: 'view' | 'create' | 'edit' | 'delete';
    fallbackLevel?: number; // Less than or equal to user level (1 is highest)
    fallback?: ReactNode;
}

export function PermissionGate({
    children,
    resource,
    action,
    fallbackLevel,
    fallback = null
}: PermissionGateProps) {
    const { user, hasPermission, hasRoleLevel } = useAuthStore();

    if (!user) {
        return <>{fallback}</>;
    }

    let isAllowed = false;

    // Check RBAC Permission first if provided
    if (resource && action) {
        if (hasPermission(`${resource}.${action}`)) {
            isAllowed = true;
        }
    }

    // Fallback to Role Level if permission not granted but fallback is defined
    if (!isAllowed && fallbackLevel !== undefined) {
        if (hasRoleLevel(fallbackLevel)) {
            isAllowed = true;
        }
    }

    // If no permission and no fallbackLevel provided, but we require a check, deny
    if (!isAllowed && (resource || fallbackLevel !== undefined)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
