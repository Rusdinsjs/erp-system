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
        <div className="space-y-6 relative">
            {/* Header section with Invoice aesthetic */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-card/60 backdrop-blur-xl border border-border p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Proforma Invoice Preview</h4>
                    <h2 className="text-3xl font-black text-foreground tracking-tight mb-1">Billing Period: {summary.period}</h2>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {summary.client_name} - {summary.asset_name} ({summary.rental_number})
                    </p>
                </div>
                <div className="mt-4 md:mt-0 relative z-10 flex flex-col items-end">
                    <StatusBadge status={summary.status} className="px-4 py-2 rounded-xl text-xs uppercase font-black tracking-widest shadow-lg shadow-black/5" />
                    <span className="text-[10px] text-muted-foreground mt-2 font-mono uppercase">Ref: {billingId.slice(0, 8)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Hours Breakdown */}
                <div className="lg:col-span-4">
                    <div className="bg-card/40 border border-border rounded-3xl p-6 h-full backdrop-blur-md hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
                                <Clock size={20} />
                            </div>
                            <h6 className="font-bold text-foreground uppercase tracking-widest text-xs">Temporal Analysis</h6>
                        </div>
                        
                        <div className="flex flex-col gap-4 text-sm font-medium">
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Operating Hours</span>
                                <span className="text-foreground font-bold">{summary.total_operating_hours} <span className="text-[10px] text-muted-foreground">HRS</span></span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Overtime Hours</span>
                                <span className="text-foreground font-bold">{summary.total_overtime_hours} <span className="text-[10px] text-muted-foreground">HRS</span></span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Standby Hours</span>
                                <span className="text-foreground font-bold">{summary.total_standby_hours} <span className="text-[10px] text-muted-foreground">HRS</span></span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Breakdown Exception</span>
                                <span className="text-destructive font-black animate-pulse">{summary.total_breakdown_hours} <span className="text-[10px] text-destructive/60">HRS</span></span>
                            </div>
                            
                            <div className="border-t border-border border-dashed my-2"></div>
                            
                            <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/10 rounded-full blur-[20px]" />
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className="font-black text-[10px] text-blue-500 uppercase tracking-widest">Billable Duration</span>
                                    {summary.shortfall_hours > 0 && (
                                        <Badge variant="warning" className="text-[9px] w-max">Min Guarantee: {summary.minimum_hours}h</Badge>
                                    )}
                                </div>
                                <span className="font-black text-2xl text-blue-500 tracking-tighter relative z-10">{summary.billable_hours}</span>
                            </div>
                            
                            {(summary.total_fuel_consumed || 0) > 0 && (
                                <>
                                    <div className="border-t border-border border-dashed my-2"></div>
                                    <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
                                        <span className="font-black text-[10px] text-amber-500 uppercase tracking-widest">Fuel Consumption</span>
                                        <span className="font-black text-amber-500">{summary.total_fuel_consumed} <span className="text-[10px]">L</span></span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Financial Breakdown */}
                <div className="lg:col-span-8">
                    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 h-full relative overflow-hidden hover:border-emerald-500/30 transition-colors shadow-lg">
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                                    <FileText size={20} />
                                </div>
                                <h6 className="font-bold text-foreground uppercase tracking-widest text-xs">Financial Ledger</h6>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">All figures in IDR</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                            {/* Detailed Line Items */}
                            <div className="flex flex-col gap-4 font-mono text-sm">
                                <div className="flex justify-between items-end border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground text-xs uppercase font-sans">Base Rate ({summary.rate_basis})</span>
                                    <span className="font-bold text-foreground">{summary.base_amount.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground text-xs uppercase font-sans">Standby Premium</span>
                                    <span className="font-bold text-foreground">{summary.standby_amount.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground text-xs uppercase font-sans">Overtime Premium</span>
                                    <span className="font-bold text-foreground">{summary.overtime_amount.toLocaleString('id-ID')}</span>
                                </div>
                                {summary.breakdown_penalty_amount > 0 && (
                                    <div className="flex justify-between items-end border-b border-destructive/20 pb-2">
                                        <span className="text-destructive/80 text-xs uppercase font-sans">Breakdown Deduction</span>
                                        <span className="font-bold text-destructive">-{summary.breakdown_penalty_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {Number(summary.fuel_surcharge_amount || 0) > 0 && (
                                    <div className="flex justify-between items-end border-b border-border/30 pb-2">
                                        <span className="text-muted-foreground text-xs uppercase font-sans">Fuel Surcharge</span>
                                        <span className="font-bold text-amber-500">+{Number(summary.fuel_surcharge_amount).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                {(Number(summary.mobilization_fee) > 0 || Number(summary.demobilization_fee) > 0) && (
                                    <div className="flex justify-between items-end border-b border-border/30 pb-2">
                                        <span className="text-muted-foreground text-xs uppercase font-sans">Mob/Demob Fees</span>
                                        <span className="font-bold text-foreground">+{(Number(summary.mobilization_fee) + Number(summary.demobilization_fee)).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Totals Section */}
                            <div className="flex flex-col gap-6 justify-end bg-muted/10 p-6 rounded-2xl border border-border/50">
                                <div className="space-y-4 font-mono text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground text-xs uppercase font-sans tracking-widest">Subtotal</span>
                                        <span className="font-bold text-foreground">{summary.subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground text-xs uppercase font-sans tracking-widest">Tax ({summary.tax_percentage}%)</span>
                                        <span className="font-bold text-foreground">+{summary.tax_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                                
                                <div className="border-t border-border border-dashed pt-6">
                                    <span className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-black block mb-1">Total Payable Amount</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-emerald-500/60">IDR</span>
                                        <span className="font-black text-4xl text-emerald-500 tracking-tighter">{summary.total_amount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card/40 border border-border rounded-3xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border text-muted-foreground">
                        <Clock size={20} />
                    </div>
                    <h6 className="font-bold text-foreground uppercase tracking-widest text-xs">Timesheet Audit Log (Historical Trace)</h6>
                </div>
                <div className="max-h-[300px] overflow-auto custom-scrollbar border border-border/50 rounded-2xl bg-background/30">
                    <table className="w-full text-left text-sm text-foreground/80 border-separate border-spacing-0">
                        <thead className="bg-card/90 sticky top-0 z-20 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">HM/KM Usage</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Op Hours</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Standby</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Overtime</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Work Desc</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {summary.timesheets?.map((ts: any) => (
                                <tr key={ts.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-foreground group-hover:text-primary transition-colors">{ts.work_date}</td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono">{ts.hm_km_usage || '-'}</td>
                                    <td className="px-6 py-4 font-bold text-primary">{ts.operating_hours}</td>
                                    <td className="px-6 py-4 font-bold text-orange-500">{ts.standby_hours}</td>
                                    <td className="px-6 py-4 font-bold text-purple-500">{ts.overtime_hours}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant="success" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest">Approved</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="truncate max-w-[200px] text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors" title={ts.work_description}>
                                            {ts.work_description || 'No description provided'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!summary.timesheets || summary.timesheets.length === 0) && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center gap-3 text-orange-500/70">
                                            <div className="p-4 bg-orange-500/10 rounded-full">
                                                <AlertCircle size={24} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">No approved timesheets found for this period.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-border/50">
                <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 hover:bg-muted font-bold text-muted-foreground hover:text-foreground">Discard Preview</Button>
                {summary.status === 'draft' && (
                    <Button
                        onClick={() => calculateMutation.mutate()}
                        loading={calculateMutation.isPending}
                        className="rounded-xl px-8 shadow-lg bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-[11px]"
                    >
                        Calculate Final Billing
                    </Button>
                )}
                {summary.status === 'calculated' && (
                    <Button
                        className="rounded-xl px-8 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-[11px]"
                        leftIcon={<Check size={16} />}
                        onClick={() => approveMutation.mutate()}
                        loading={approveMutation.isPending}
                    >
                        Approve & Confirm
                    </Button>
                )}
                {summary.status === 'approved' && (
                    <Button
                        className="rounded-xl px-8 shadow-lg shadow-teal-500/20 bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase tracking-widest text-[11px]"
                        leftIcon={<FileText size={16} />}
                        onClick={() => invoiceMutation.mutate()}
                        loading={invoiceMutation.isPending}
                    >
                        Generate Invoice Document
                    </Button>
                )}
            </div>
        </div>
    );
}
