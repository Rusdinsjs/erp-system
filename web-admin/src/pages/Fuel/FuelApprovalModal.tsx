import React, { useState } from 'react';
import { Modal, Button, useToast } from '../../components/ui';
import { fuelApi, type FuelLog } from '../../api/fuel';
import { Check, Printer, Maximize2 } from 'lucide-react';

interface FuelApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    log: FuelLog;
}

export const FuelApprovalModal: React.FC<FuelApprovalModalProps> = ({ isOpen, onClose, onSuccess, log }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);

    const handleApprove = async () => {
        setLoading(true);
        try {
            const coupon = await fuelApi.approve(log.id);
            setGeneratedCoupon(coupon);
            success('Request approved! Coupon generated.', 'Success');
            // Don't close immediately, show coupon content
        } catch (error) {
            console.error(error);
            showError('Failed to approve request', 'Error');
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (generatedCoupon) onSuccess(); // If approved, trigger refresh
        else onClose(); // If cancelled/no action
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Fuel Request Approval">
            <div className="space-y-6">
                {!generatedCoupon ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400">Tracking Number</p>
                                <p className="font-mono text-white">{log.tracking_number}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Requested By</p>
                                <p className="text-white">{log.requester_name}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Asset</p>
                                <p className="text-white font-medium">{log.asset_name}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Requested Amount/Volume</p>
                                <p className="text-white text-lg font-bold text-blue-400">
                                    {Number(log.requested_value).toLocaleString()} {log.request_type === 'volume' ? 'L' : 'IDR'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-slate-400 text-sm">Odometer Check ({Number(log.odometer_reading).toLocaleString()} KM)</p>
                            <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                                <img
                                    src={`${import.meta.env.VITE_API_URL || ''}${log.odometer_image_url}`}
                                    alt="Odometer"
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=Image+Error')}
                                />
                                <a
                                    href={`${import.meta.env.VITE_API_URL || ''}${log.odometer_image_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-2 right-2 p-1 bg-black/50 rounded hover:bg-black/80"
                                >
                                    <Maximize2 size={16} />
                                </a>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                            <Button variant="ghost" onClick={onClose} disabled={loading}>Close</Button>
                            {/* Reject logic handled in list for now or add reject prompt here */}
                            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                                {loading ? 'Processing...' : 'Approve & Generate Coupon'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 space-y-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                            <Check size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Request Approved</h3>
                            <p className="text-slate-400 mt-1">Share this coupon code with the driver</p>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl border border-dashed border-slate-600">
                            <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Coupon Code</p>
                            <p className="text-4xl font-mono font-bold text-white tracking-widest">{generatedCoupon}</p>
                        </div>

                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => window.print()}>
                                <Printer size={18} className="mr-2" /> Print Voucher
                            </Button>
                            <Button onClick={onSuccess}>Done</Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
