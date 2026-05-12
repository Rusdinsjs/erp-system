import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { StatCard } from './StatCard';
import { contractApi } from '../../api/contract';

export function PendingApprovalsWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['contracts', 'pending-count'],
        queryFn: () => contractApi.getPendingCount(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    return (
        <StatCard
            label="Pending Approvals"
            value={isLoading ? '...' : data?.count || 0}
            icon={FileText}
            color="text-indigo-500"
            description="Contracts awaiting review"
        />
    );
}
