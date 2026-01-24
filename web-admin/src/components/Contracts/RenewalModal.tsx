import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractApi } from '../../api/contract';
import type { RenewalRequest, RenewalOptions } from '../../types/contract';
import { X, RefreshCw, Calendar, CheckCircle, Info } from 'lucide-react';

interface RenewalModalProps {
    contractId: string;
    contractNumber: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function RenewalModal({
    contractId,
    contractNumber,
    isOpen,
    onClose,
}: RenewalModalProps) {
    const queryClient = useQueryClient();
    const [renewalType, setRenewalType] = useState<'extend' | 'modify' | 'new'>('extend');
    const [newEndDate, setNewEndDate] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [autoRenew, setAutoRenew] = useState(false);
    const [priceLock, setPriceLock] = useState(true);

    // Fetch renewal options
    const { data: options, isLoading: isLoadingOptions } = useQuery<RenewalOptions>({
        queryKey: ['contract-renewal-options', contractId],
        queryFn: () => contractApi.getRenewalOptions(contractId),
        enabled: isOpen,
    });

    useEffect(() => {
        if (options) {
            setNewEndDate(options.suggested_end_date.split('T')[0]);
            setNewStartDate(options.current_end_date.split('T')[0]);
        }
    }, [options]);

    const renewalMutation = useMutation({
        mutationFn: (request: RenewalRequest) => contractApi.renew(contractId, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract-detail', contractId] });
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            queryClient.invalidateQueries({ queryKey: ['contract-renewals', contractId] });
            handleClose();
            alert('Contract renewal processed successfully');
        },
        onError: (error: any) => {
            console.error('Renewal failed:', error);
            alert(`Failed to renew contract: ${error.response?.data?.message || 'Please try again.'}`);
        },
    });

    const handleClose = () => {
        setRenewalType('extend');
        setNotes('');
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const request: RenewalRequest = {
            renewal_type: renewalType,
            new_end_date: newEndDate || undefined,
            notes: notes || undefined,
        };

        if (renewalType === 'modify' || renewalType === 'new') {
            request.payment_terms = paymentTerms || undefined;
            request.auto_renew = autoRenew;
            request.price_lock = priceLock;
        }

        if (renewalType === 'new') {
            request.new_start_date = newStartDate || undefined;
        }

        renewalMutation.mutate(request);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={handleClose}
                />

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <RefreshCw className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Renew Contract</h3>
                                <p className="text-xs text-gray-500">{contractNumber}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                        {isLoadingOptions ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-gray-500">Checking renewal options...</p>
                            </div>
                        ) : (
                            <>
                                {/* Status Banner */}
                                {options && options.expiring_in_days <= 30 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                                        <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-amber-800 font-medium">Contract Expiring Soon</p>
                                            <p className="text-xs text-amber-700">
                                                This contract expires in {options.expiring_in_days} days. Renewing now ensures continuous service.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Renewal Type Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Renewal Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'extend', label: 'Extend', desc: 'Keep terms, change end date', icon: RefreshCw },
                                            { id: 'modify', label: 'Modify', desc: 'Reset end date & update terms', icon: Calendar },
                                            { id: 'new', label: 'New', desc: 'Create new linked contract', icon: CheckCircle },
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setRenewalType(type.id as any)}
                                                className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${renewalType === type.id
                                                        ? 'border-blue-600 bg-blue-50/50'
                                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                                    }`}
                                            >
                                                <type.icon className={`h-5 w-5 mb-1 ${renewalType === type.id ? 'text-blue-600' : 'text-gray-400'
                                                    }`} />
                                                <span className={`text-sm font-semibold ${renewalType === type.id ? 'text-blue-700' : 'text-gray-700'
                                                    }`}>{type.label}</span>
                                                <span className="text-[10px] text-gray-500 text-center leading-tight mt-1">{type.desc}</span>
                                                {renewalType === type.id && (
                                                    <div className="absolute top-1 right-1">
                                                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    {renewalType === 'new' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                New Start Date
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={newStartDate}
                                                    onChange={(e) => setNewStartDate(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className={renewalType !== 'new' ? 'col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {renewalType === 'new' ? 'New End Date' : 'Extended End Date'}
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="date"
                                                value={newEndDate}
                                                onChange={(e) => setNewEndDate(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Terms (Modify/New) */}
                                {(renewalType === 'modify' || renewalType === 'new') && (
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Updated Terms</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
                                                <select
                                                    value={paymentTerms}
                                                    onChange={(e) => setPaymentTerms(e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                                >
                                                    <option value="">No change</option>
                                                    <option value="NET_30">NET 30</option>
                                                    <option value="NET_45">NET 45</option>
                                                    <option value="NET_60">NET 60</option>
                                                    <option value="COD">COD</option>
                                                    <option value="PREPAID">Prepaid</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col space-y-3 pt-4">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={autoRenew}
                                                        onChange={(e) => setAutoRenew(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-700">Auto Renew</span>
                                                </label>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={priceLock}
                                                        onChange={(e) => setPriceLock(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-700">Price Lock</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Renewal Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Add any internal notes about this renewal..."
                                    />
                                </div>
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={renewalMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={renewalMutation.isPending || isLoadingOptions}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            >
                                {renewalMutation.isPending ? 'Processing...' : 'Confirm Renewal'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
