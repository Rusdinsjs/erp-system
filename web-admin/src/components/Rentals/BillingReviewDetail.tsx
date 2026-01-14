// BillingReviewDetail - Pure Tailwind
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../api/timesheet';
import { Clock, AlertCircle, Check, FileText } from 'lucide-react';
import {
    Button, Badge, Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    LoadingOverlay, Card, useToast
} from '../ui';

interface Props {
    billingId: string;
    onClose: () => void;
}

export function BillingReviewDetail({ billingId, onClose }: Props) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const { data: summary, isLoading } = useQuery({
        queryKey: ['billing', 'summary', billingId],
        queryFn: () => billingApi.getSummary(billingId)
    });

    const calculateMutation = useMutation({
        mutationFn: () => billingApi.calculate(billingId, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            success('Billing recalculated based on latest timesheets', 'Success');
        },
        onError: (err: any) => showError(err.message || 'Calculation failed', 'Error')
    });

    const approveMutation = useMutation({
        mutationFn: () => billingApi.approve(billingId, 'Approved via dashboard'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            success('Billing approved', 'Success');
        },
        onError: (err: any) => showError(err.message || 'Approval failed', 'Error')
    });

    const invoiceMutation = useMutation({
        mutationFn: () => billingApi.generateInvoice(billingId),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            success(`Invoice ${data.invoice_number || ''} generated successfully`, 'Success');
        },
        onError: (err: any) => showError(err.message || 'Generation failed', 'Error')
    });

    if (isLoading) return <div className="h-48 relative"><LoadingOverlay visible /></div>;
    if (!summary) return <div className="h-48 flex items-center justify-center text-slate-400">No data found</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'invoiced': return 'info';
            case 'paid': return 'success';
            case 'draft': return 'default';
            default: return 'warning';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-white">Billing Period: {summary.period}</h4>
                    <p className="text-sm text-slate-500">{summary.client_name} - {summary.asset_name} ({summary.rental_number})</p>
                </div>
                <Badge variant={getStatusColor(summary.status)}>{summary.status}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                    <Card padding="md" className="h-full">
                        <h6 className="font-semibold text-white mb-2">Hours Breakdown</h6>
                        <div className="flex flex-col gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Operating Hours</span>
                                <span className="font-medium text-white">{summary.total_operating_hours}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Overtime Hours</span>
                                <span className="font-medium text-white">{summary.total_overtime_hours}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Standby Hours</span>
                                <span className="font-medium text-white">{summary.total_standby_hours}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Breakdown Hours</span>
                                <span className="font-medium text-red-400">{summary.total_breakdown_hours}</span>
                            </div>
                            <div className="border-t border-slate-800 my-1"></div>
                            <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded">
                                <div className="flex gap-2 items-center">
                                    <span className="font-bold text-white">Billable Hours</span>
                                    {summary.shortfall_hours > 0 && (
                                        <Badge variant="warning" className="text-xs">Min {summary.minimum_hours}</Badge>
                                    )}
                                </div>
                                <span className="font-bold text-blue-400">{summary.billable_hours}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-8">
                    <Card padding="md" className="h-full">
                        <h6 className="font-semibold text-white mb-2">Financial Breakdown</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Base Amount ({summary.rate_basis})</span>
                                    <span>{summary.base_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Standby Amount</span>
                                    <span>{summary.standby_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Overtime Amount</span>
                                    <span>{summary.overtime_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Breakdown Penalty</span>
                                    <span className="text-red-400">{summary.breakdown_penalty_amount.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="font-semibold text-white">{summary.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Tax ({summary.tax_percentage}%)</span>
                                    <span>{summary.tax_amount.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-slate-800 my-1"></div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-bold text-white">Total Amount</span>
                                    <span className="font-bold text-blue-400">Rp {summary.total_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Card padding="md">
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-slate-400" />
                    <h6 className="font-semibold text-white">Timesheet Audit Log (Historical Accuracy)</h6>
                </div>
                <div className="max-h-[300px] overflow-auto border border-slate-800 rounded-lg">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Date</TableTh>
                                <TableTh>HM/KM Usage</TableTh>
                                <TableTh>Op Hours</TableTh>
                                <TableTh>Standby</TableTh>
                                <TableTh>Overtime</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh>Work Desc</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {summary.timesheets?.map((ts: any) => (
                                <TableRow key={ts.id}>
                                    <TableTd>{ts.work_date}</TableTd>
                                    <TableTd>{ts.hm_km_usage || '-'}</TableTd>
                                    <TableTd>{ts.operating_hours}</TableTd>
                                    <TableTd>{ts.standby_hours}</TableTd>
                                    <TableTd>{ts.overtime_hours}</TableTd>
                                    <TableTd>
                                        <Badge variant="success">Approved</Badge>
                                    </TableTd>
                                    <TableTd>
                                        <div className="truncate max-w-[200px]" title={ts.work_description}>
                                            {ts.work_description}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))}
                            {(!summary.timesheets || summary.timesheets.length === 0) && (
                                <TableRow>
                                    <TableTd colSpan={7} className="text-center py-6 text-orange-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle size={16} />
                                            <span>No approved timesheets found for this period.</span>
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>Close</Button>
                {summary.status === 'draft' && (
                    <Button
                        onClick={() => calculateMutation.mutate()}
                        loading={calculateMutation.isPending}
                    >
                        Calculate Final Billing
                    </Button>
                )}
                {summary.status === 'calculated' && (
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        leftIcon={<Check size={16} />}
                        onClick={() => approveMutation.mutate()}
                        loading={approveMutation.isPending}
                    >
                        Approve & Confirm
                    </Button>
                )}
                {summary.status === 'approved' && (
                    <Button
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        leftIcon={<FileText size={16} />}
                        onClick={() => invoiceMutation.mutate()}
                        loading={invoiceMutation.isPending}
                    >
                        Generate Invoice
                    </Button>
                )}
            </div>
        </div>
    );
}
