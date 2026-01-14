import { StatusBadge as PureStatusBadge } from '../ui/Badge';

interface StatusBadgeProps {
    status: string;
    customColors?: any; // Ignored in migration
    className?: string;
    [key: string]: any;
}

export function StatusBadge({ status, customColors, ...props }: StatusBadgeProps) {
    return <PureStatusBadge status={status || ''} {...props} />;
}
