// Badge Component - Pure Tailwind
import { type ReactNode } from 'react';
import { getAssetStatusLabel, getAssetStatusBadgeVariant } from '../../config/assetStatusConfig';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = ''
}: BadgeProps) {
    const variants = {
        default: 'bg-muted text-muted-foreground border border-border',
        success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        outline: 'bg-transparent border border-border text-muted-foreground',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-full
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}

// Status Badge with predefined colors
interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const statusVariants: Record<string, BadgeProps['variant']> = {
        // Work order statuses
        pending: 'warning',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'danger',

        // Approval statuses
        approved: 'success',
        rejected: 'danger',
        pending_approval: 'warning',

        // Rental statuses
        requested: 'info',
        returned: 'default',

        // Loan statuses
        on_loan: 'info',
        overdue: 'danger',
    };

    const normalizedKey = status.toLowerCase();
    const variant = statusVariants[normalizedKey] || getAssetStatusBadgeVariant(normalizedKey);
    const displayText = statusVariants[normalizedKey] 
        ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : getAssetStatusLabel(normalizedKey);

    return (
        <Badge variant={variant} className={className}>
            {displayText}
        </Badge>
    );
}
