// BillingHistory Component - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Download, Eye } from 'lucide-react';
import { billingApi } from '../../api/timesheet';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Button,
    LoadingOverlay,
    ActionIcon,
    StatusBadge
} from '../ui';

interface BillingHistoryProps {
    rentalId: string;
}

export function BillingHistory({ rentalId }: BillingHistoryProps) {
    const { data: billingPeriods, isLoading } = useQuery({
        queryKey: ['billing-history', rentalId],
        queryFn: () => billingApi.listByRental(rentalId),
        enabled: !!rentalId
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button leftIcon={<Download size={16} />}>
                    Create Bill / Calculate
                </Button>
            </div>

            <div className="relative min-h-[100px]">
                <LoadingOverlay visible={isLoading} />
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Period</TableTh>
                            <TableTh>Operating Hours</TableTh>
                            <TableTh>Amount</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {billingPeriods && billingPeriods.length > 0 ? (
                            billingPeriods.map((bp) => (
                                <TableRow key={bp.id}>
                                    <TableTd>
                                        <div className="font-medium text-white">{bp.period_start} - {bp.period_end}</div>
                                    </TableTd>
                                    <TableTd>{bp.total_operating_hours || 0} hrs</TableTd>
                                    <TableTd>Rp {(bp.total_amount || 0).toLocaleString()}</TableTd>
                                    <TableTd>
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={bp.status} />
                                            {bp.invoice_number && (
                                                <span className="text-xs text-slate-500">Inv: {bp.invoice_number}</span>
                                            )}
                                        </div>
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ActionIcon title="View Details">
                                                <Eye size={16} />
                                            </ActionIcon>
                                            {(bp.status === 'invoiced' || bp.status === 'paid') && (
                                                <ActionIcon className="text-blue-400 hover:bg-blue-900/20" title="Download Invoice">
                                                    <Download size={16} />
                                                </ActionIcon>
                                            )}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && <TableEmpty colSpan={5} message="No billing history found." />
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
