// WorkOrderHistory - Display Work Orders for an Asset
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle, Calendar, Wrench, AlertTriangle } from 'lucide-react';
import { workOrderApi } from '../../api/work-order';
import type { WorkOrder } from '../../api/work-order';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    Button,
    LoadingOverlay,
    useToast,
} from '../ui';

interface WorkOrderHistoryProps {
    assetId: string;
    onCreateNew?: () => void;
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    in_progress: 'bg-primary/20 text-primary border-primary/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-muted/50 text-muted-foreground border-border/50',
};

const typeIcons: Record<string, React.ReactNode> = {
    maintenance: <Wrench size={14} />,
    preventive: <Calendar size={14} />,
    repair: <AlertTriangle size={14} />,
    corrective: <AlertTriangle size={14} />,
};

export function WorkOrderHistory({ assetId }: WorkOrderHistoryProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const { data: workOrders, isLoading } = useQuery({
        queryKey: ['work-orders-by-asset', assetId],
        queryFn: () => workOrderApi.listByAsset(assetId),
        enabled: !!assetId,
    });

    const startMutation = useMutation({
        mutationFn: (id: string) => workOrderApi.start(id),
        onSuccess: () => {
            success('Work Order started. Asset status updated.', 'Started');
            queryClient.invalidateQueries({ queryKey: ['work-orders-by-asset', assetId] });
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['asset-detail', assetId] });
        },
        onError: (err: any) => showError(err.message || 'Failed to start', 'Error'),
    });

    const completeMutation = useMutation({
        mutationFn: (id: string) => workOrderApi.complete(id, { work_performed: 'Completed via Lifecycle page' }),
        onSuccess: () => {
            success('Work Order completed. Asset returned to Deployed.', 'Completed');
            queryClient.invalidateQueries({ queryKey: ['work-orders-by-asset', assetId] });
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['asset-detail', assetId] });
        },
        onError: (err: any) => showError(err.message || 'Failed to complete', 'Error'),
    });

    const activeWO = workOrders?.find(wo => wo.status === 'in_progress' || wo.status === 'assigned');

    return (
        <div className="space-y-4 relative">
            <LoadingOverlay visible={isLoading} />

            {/* Active WO Alert */}
            {activeWO && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Wrench size={16} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-primary font-medium">Active Work Order: {activeWO.wo_number}</p>
                            <p className="text-xs text-muted-foreground">{activeWO.wo_type} • {activeWO.status}</p>
                        </div>
                    </div>
                    {activeWO.status === 'in_progress' && (
                        <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<CheckCircle size={14} />}
                            onClick={() => completeMutation.mutate(activeWO.id)}
                            loading={completeMutation.isPending}
                        >
                            Complete
                        </Button>
                    )}
                    {activeWO.status === 'assigned' && (
                        <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<Play size={14} />}
                            onClick={() => startMutation.mutate(activeWO.id)}
                            loading={startMutation.isPending}
                        >
                            Start Work
                        </Button>
                    )}
                </div>
            )}

            <Table>
                <TableHead>
                    <TableRow>
                        <TableTh>WO Number</TableTh>
                        <TableTh>Type</TableTh>
                        <TableTh>Status</TableTh>
                        <TableTh>Scheduled</TableTh>
                        <TableTh>Cost</TableTh>
                        <TableTh align="center">Actions</TableTh>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {!workOrders || workOrders.length === 0 ? (
                        <TableEmpty colSpan={6} message="No work orders for this asset" />
                    ) : (
                        workOrders.map((wo: WorkOrder) => (
                            <TableRow key={wo.id}>
                                <TableTd>
                                    <span className="font-medium text-foreground">{wo.wo_number}</span>
                                </TableTd>
                                <TableTd>
                                    <div className="flex items-center gap-2">
                                        {typeIcons[wo.wo_type] || <Wrench size={14} />}
                                        <span className="capitalize">{wo.wo_type}</span>
                                    </div>
                                </TableTd>
                                <TableTd>
                                    <Badge className={statusColors[wo.status] || statusColors.pending}>
                                        {wo.status.replace('_', ' ')}
                                    </Badge>
                                </TableTd>
                                <TableTd>{wo.scheduled_date || '-'}</TableTd>
                                <TableTd>
                                    {wo.actual_cost
                                        ? `Rp ${Number(wo.actual_cost).toLocaleString('id-ID')}`
                                        : wo.estimated_cost
                                            ? `~Rp ${Number(wo.estimated_cost).toLocaleString('id-ID')}`
                                            : '-'}
                                </TableTd>
                                <TableTd align="center">
                                    {wo.status === 'assigned' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<Play size={12} />}
                                            onClick={() => startMutation.mutate(wo.id)}
                                            loading={startMutation.isPending}
                                        >
                                            Start
                                        </Button>
                                    )}
                                    {wo.status === 'in_progress' && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<CheckCircle size={12} />}
                                            onClick={() => completeMutation.mutate(wo.id)}
                                            loading={completeMutation.isPending}
                                        >
                                            Complete
                                        </Button>
                                    )}
                                </TableTd>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
