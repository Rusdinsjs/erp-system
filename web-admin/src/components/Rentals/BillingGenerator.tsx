import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, FileText, Check, AlertTriangle } from 'lucide-react';
import { Button, Card, DateInput, useToast, LoadingOverlay, Badge } from '../ui';
import { rentalBillingApi } from '../../api/rental-billing';
import type { RentalBillingPeriod } from '../../api/rental-billing';

interface BillingGeneratorProps {
    rentalId: string;
    onSuccess?: () => void;
}

export function BillingGenerator({ rentalId, onSuccess }: BillingGeneratorProps) {
    const { success, error: showError } = useToast();
    const queryClient = useQueryClient();

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [previewData, setPreviewData] = useState<RentalBillingPeriod | null>(null);

    // Preview Mutation
    const previewMutation = useMutation({
        mutationFn: async () => {
            if (!startDate || !endDate) throw new Error("Select dates first");
            return rentalBillingApi.preview(
                rentalId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
        },
        onSuccess: (data: any) => {
            setPreviewData(data);
        },
        onError: (err: any) => {
            showError("Failed to calculate billing preview");
            console.error(err);
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!startDate || !endDate) throw new Error("Select dates first");
            return rentalBillingApi.create(
                rentalId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
        },
        onSuccess: () => {
            success("Invoice generated successfully");
            setPreviewData(null);
            setStartDate(null);
            setEndDate(null);
            queryClient.invalidateQueries({ queryKey: ['rental-billings', rentalId] });
            if (onSuccess) onSuccess();
        },
        onError: () => {
            showError("Failed to create invoice");
        }
    });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

    return (
        <div className="space-y-6">
            <Card padding="md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-emerald-400" />
                    Generate New Invoice
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <DateInput
                        label="Start Date"
                        value={startDate}
                        onChange={setStartDate}
                    />
                    <DateInput
                        label="End Date"
                        value={endDate}
                        onChange={setEndDate}
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            leftIcon={<Play size={16} />}
                            disabled={!startDate || !endDate || previewMutation.isPending}
                            onClick={() => previewMutation.mutate()}
                        >
                            Preview Calculation
                        </Button>
                    </div>
                </div>

                {previewMutation.isPending && (
                    <div className="py-8 flex justify-center">
                        <LoadingOverlay visible />
                    </div>
                )}
            </Card>

            {previewData && (
                <Card padding="md" className="border-emerald-500/30 bg-emerald-950/10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-xl font-bold text-white">Billing Preview</h4>
                            <p className="text-slate-400 text-sm">
                                Period: {previewData.period_start} to {previewData.period_end}
                            </p>
                        </div>
                        <Badge variant="warning">DRAFT PREVIEW</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Hours Breakdown */}
                        <div className="space-y-4">
                            <h5 className="font-semibold text-slate-300 border-b border-slate-700 pb-2">Usage Summary</h5>

                            {(previewData.total_production_volume || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-400 font-medium">Total Volume</span>
                                    <span className="text-white font-bold">{previewData.total_production_volume} BCM</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Operating Hours</span>
                                <span className="text-white font-medium">{previewData.total_operating_hours} hrs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Standby Hours</span>
                                <span className="text-white font-medium">{previewData.total_standby_hours} hrs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Overtime Hours</span>
                                <span className="text-white font-medium">{previewData.total_overtime_hours} hrs</span>
                            </div>
                            {(Number(previewData.total_fuel_consumed || 0) > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Fuel Consumed</span>
                                    <span className="text-amber-400 font-medium">{previewData.total_fuel_consumed} L</span>
                                </div>
                            )}

                            <div className="h-px bg-slate-800 my-2" />

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Minimum Contract</span>
                                <span className="text-slate-300">{previewData.minimum_hours} hrs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-400 font-bold">Billable Hours</span>
                                <span className="text-white font-bold">{previewData.billable_hours} hrs</span>
                            </div>
                            {previewData.shortfall_hours > 0 && (
                                <div className="flex justify-between text-xs text-amber-500 bg-amber-950/20 p-2 rounded">
                                    <span>Shortfall Charged</span>
                                    <span>{previewData.shortfall_hours} hrs</span>
                                </div>
                            )}

                            {/* KPI Metrics Section */}
                            {previewData.mechanical_availability !== undefined && (
                                <div className="mt-4 p-3 bg-slate-900/80 rounded-lg border border-slate-700">
                                    <h6 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                        📊 Equipment Performance (KPI)
                                    </h6>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* MA - Mechanical Availability */}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">MA</span>
                                            <span className={`font-bold ${(previewData.mechanical_availability || 0) >= (previewData.ma_threshold || 85)
                                                ? 'text-emerald-400'
                                                : 'text-red-400'
                                                }`}>
                                                {(previewData.mechanical_availability || 0).toFixed(1)}%
                                                {(previewData.mechanical_availability || 0) >= (previewData.ma_threshold || 85)
                                                    ? ' ✅'
                                                    : ' ⚠️'}
                                            </span>
                                        </div>
                                        {/* PA - Physical Availability */}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">PA</span>
                                            <span className="text-white font-medium">
                                                {(previewData.physical_availability || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                        {/* UA - Utilization Availability */}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">UA</span>
                                            <span className="text-white font-medium">
                                                {(previewData.utilization_availability || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                        {/* EU - Effective Utilization */}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">EU</span>
                                            <span className="text-white font-medium">
                                                {(previewData.effective_utilization || 0).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Availability Penalty Warning */}
                                    {(previewData.availability_penalty || 0) > 0 && (
                                        <div className="mt-3 p-2 bg-red-950/30 border border-red-800/50 rounded text-xs text-red-400">
                                            <div className="flex justify-between font-medium">
                                                <span>⚠️ Availability Penalty (MA &lt; {previewData.ma_threshold || 85}%)</span>
                                                <span>{formatCurrency(previewData.availability_penalty || 0)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Financials */}
                        <div className="space-y-4">
                            <h5 className="font-semibold text-slate-300 border-b border-slate-700 pb-2">Cost Calculation</h5>

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Base Amount</span>
                                <span className="text-white">{formatCurrency(previewData.base_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Standby Cost</span>
                                <span className="text-white">{formatCurrency(previewData.standby_amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Overtime Cost</span>
                                <span className="text-white">{formatCurrency(previewData.overtime_amount)}</span>
                            </div>
                            {(Number(previewData.fuel_surcharge_amount || 0) > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Fuel Surcharge ({formatCurrency(previewData.fuel_surcharge_rate || 0)}/L)</span>
                                    <span className="text-amber-400">{formatCurrency(previewData.fuel_surcharge_amount || 0)}</span>
                                </div>
                            )}

                            <div className="bg-slate-900 p-3 rounded-lg space-y-2 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-white font-semibold">{formatCurrency(previewData.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Tax</span>
                                    <span className="text-white">{formatCurrency(previewData.tax_amount)}</span>
                                </div>
                                <div className="h-px bg-slate-700 my-1" />
                                <div className="flex justify-between text-lg">
                                    <span className="text-emerald-400 font-bold">Total</span>
                                    <span className="text-white font-bold">{formatCurrency(previewData.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setPreviewData(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            leftIcon={<Check size={18} />}
                            loading={createMutation.isPending}
                            onClick={() => createMutation.mutate()}
                        >
                            Finalize Invoice
                        </Button>
                    </div>

                    <div className="mt-4 p-3 bg-blue-950/20 text-blue-300 text-xs rounded flex items-start gap-2 border border-blue-900/50">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <p>
                            Finalizing will generate a permanent invoice record and lock the billing period.
                            Ensure all timesheets for this period are verified before proceeding.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
