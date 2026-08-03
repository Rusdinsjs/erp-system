import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface PermissionGateProps {
    children: ReactNode;
    resource?: string;
    action?: 'view' | 'read' | 'create' | 'edit' | 'update' | 'delete' | 'approve' | 'all';
    permission?: string;
    fallbackLevel?: number; // Less than or equal to user level (1 is highest)
    fallback?: ReactNode;
}

export function PermissionGate({
    children,
    resource,
    action,
    permission,
    fallbackLevel,
    fallback = null
}: PermissionGateProps) {
    const { user, hasPermission, hasRoleLevel } = useAuthStore();

    if (!user) {
        return <>{fallback}</>;
    }

    let isAllowed = false;

    // Check direct permission string e.g. "asset.create"
    if (permission) {
        if (hasPermission(permission)) {
            isAllowed = true;
        }
    }

    // Check RBAC Permission resource + action
    if (!isAllowed && resource && action) {
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

    // If no permission parameters were provided at all, allow by default
    if (!permission && !resource && fallbackLevel === undefined) {
        isAllowed = true;
    }

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
