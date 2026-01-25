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
        default: 'bg-gray-700 text-gray-200 border border-gray-600',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        outline: 'bg-transparent border border-gray-600 text-gray-300',
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
        // Standard Asset Statuses (match Backend AssetState)
        planning: 'default',
        procurement: 'info',
        received: 'info',
        in_inventory: 'success', // Replaces 'available'
        deployed: 'success',     // Replaces 'active'
        rented_out: 'warning',
        under_maintenance: 'warning',
        under_repair: 'warning',
        under_conversion: 'info',
        retired: 'default',
        disposed: 'danger',
        lost_stolen: 'danger',
        archived: 'outline',

        // Legacy/Alias mappings (for backward compat only, should migrate data)
        active: 'success',
        available: 'success',

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

    const variant = statusVariants[status.toLowerCase()] || 'default';

    // Custom formatted labels
    let displayText = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (status === 'in_inventory') displayText = 'In Inventory';
    if (status === 'rented_out') displayText = 'Rented Out';
    if (status === 'lost_stolen') displayText = 'Lost/Stolen';
    if (status === 'under_maintenance') displayText = 'Under Maintenance';
    if (status === 'under_repair') displayText = 'Under Repair';
    if (status === 'under_conversion') displayText = 'Under Conversion';

    return (
        <Badge variant={variant} className={className}>
            {displayText}
        </Badge>
    );
}
