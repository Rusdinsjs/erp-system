// Badge Component - Pure Tailwind
import { type ReactNode } from 'react';

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
        default: 'bg-slate-700 text-slate-200',
        success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
        outline: 'bg-transparent border border-slate-600 text-slate-300',
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
        // Asset statuses
        active: 'success',
        available: 'success',
        planning: 'info',
        maintenance: 'warning',
        disposed: 'danger',
        sold: 'danger',

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
        rented_out: 'success',
        returned: 'default',

        // Loan statuses
        on_loan: 'info',
        overdue: 'danger',
    };

    const variant = statusVariants[status.toLowerCase()] || 'default';
    const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <Badge variant={variant} className={className}>
            {displayText}
        </Badge>
    );
}
