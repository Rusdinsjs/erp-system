import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, RotateCcw } from 'lucide-react';
import { rentalBillingApi, type RentalBillingPeriod } from '../../api/rental-billing';

interface BillingAdjustmentModalProps {
    billing: RentalBillingPeriod;
    isOpen: boolean;
    onClose: () => void;
}

interface AdjustmentForm {
    base_amount?: number;
    standby_amount?: number;
    overtime_amount?: number;
    breakdown_penalty_amount?: number;
    mobilization_fee?: number;
    demobilization_fee?: number;
    other_charges?: number;
    other_charges_description?: string;
    discount_percentage?: number;
    adjustment_notes?: string;
}

export function BillingAdjustmentModal({ billing, isOpen, onClose }: BillingAdjustmentModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<AdjustmentForm>({});

    const updateMutation = useMutation({
        mutationFn: (data: AdjustmentForm) =>
            rentalBillingApi.updateBilling(billing.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-billing', billing.id] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const handleReset = () => {
        setFormData({});
    };

    if (!isOpen) return null;

    // Only allow adjustments for draft or calculated status
    if (billing.status !== 'draft' && billing.status !== 'calculated') {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 max-w-md">
                    <h3 className="text-lg font-semibold text-white mb-4">Cannot Adjust Billing</h3>
                    <p className="text-slate-300 mb-4">
                        Only draft or calculated billing can be adjusted.
                        Current status: <span className="font-bold text-cyan-400">{billing.status}</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-white">Adjust Billing Period</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded transition"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Calculated Amounts Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-cyan-400 mb-4">Override Calculated Amounts</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">
                                    Base Amount
                                    <span className="text-xs text-slate-500 ml-2">
                                        (Auto: {billing.base_amount?.toLocaleString() || 0})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.base_amount ?? ''}
                                    onChange={(e) => setFormData({ ...formData, base_amount: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="Leave empty to keep auto-calculated"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">
                                    Standby Amount
                                    <span className="text-xs text-slate-500 ml-2">
                                        (Auto: {billing.standby_amount?.toLocaleString() || 0})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.standby_amount ?? ''}
                                    onChange={(e) => setFormData({ ...formData, standby_amount: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="Leave empty to keep auto-calculated"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">
                                    Overtime Amount
                                    <span className="text-xs text-slate-500 ml-2">
                                        (Auto: {billing.overtime_amount?.toLocaleString() || 0})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.overtime_amount ?? ''}
                                    onChange={(e) => setFormData({ ...formData, overtime_amount: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="Leave empty to keep auto-calculated"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">
                                    Breakdown Penalty
                                    <span className="text-xs text-slate-500 ml-2">
                                        (Auto: {billing.breakdown_penalty_amount?.toLocaleString() || 0})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.breakdown_penalty_amount ?? ''}
                                    onChange={(e) => setFormData({ ...formData, breakdown_penalty_amount: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="Leave empty to keep auto-calculated"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Charges */}
                    <div>
                        <h3 className="text-sm font-semibold text-cyan-400 mb-4">Additional Charges</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Mobilization Fee</label>
                                <input
                                    type="number"
                                    value={formData.mobilization_fee ?? ''}
                                    onChange={(e) => setFormData({ ...formData, mobilization_fee: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Demobilization Fee</label>
                                <input
                                    type="number"
                                    value={formData.demobilization_fee ?? ''}
                                    onChange={(e) => setFormData({ ...formData, demobilization_fee: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm text-slate-300 mb-1">Other Charges</label>
                            <input
                                type="number"
                                value={formData.other_charges ?? ''}
                                onChange={(e) => setFormData({ ...formData, other_charges: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm text-slate-300 mb-1">Other Charges Description</label>
                            <input
                                type="text"
                                value={formData.other_charges_description ?? ''}
                                onChange={(e) => setFormData({ ...formData, other_charges_description: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                placeholder="e.g., Emergency support, Special equipment"
                            />
                        </div>
                    </div>

                    {/* Discount */}
                    <div>
                        <h3 className="text-sm font-semibold text-cyan-400 mb-4">Discount</h3>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Discount Percentage (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.discount_percentage ?? ''}
                                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none"
                                placeholder="Enter 0-100"
                            />
                        </div>
                    </div>

                    {/* Adjustment Notes */}
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Adjustment Notes <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={formData.adjustment_notes ?? ''}
                            onChange={(e) => setFormData({ ...formData, adjustment_notes: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:border-cyan-500 focus:outline-none min-h-[100px]"
                            placeholder="Explain reason for adjustment (required for audit trail)"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Required for audit trail. Explain why these adjustments are being made.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset to Auto
                        </button>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending || !formData.adjustment_notes}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition"
                        >
                            <Save className="w-4 h-4" />
                            {updateMutation.isPending ? 'Saving...' : 'Save Adjustments'}
                        </button>
                    </div>

                    {updateMutation.isError && (
                        <div className="p-3 bg-red-950/30 border border-red-700 rounded text-red-400 text-sm">
                            Error: {(updateMutation.error as Error).message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
