import React, { useState } from 'react';
import { Modal, Button, useToast } from '../../components/ui';
import { fuelApi, type FuelLog } from '../../api/fuel';
import { Printer, Maximize2, Hash, User, Package, Fuel } from 'lucide-react';

interface FuelApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    log: FuelLog;
}

export const FuelApprovalModal: React.FC<FuelApprovalModalProps> = ({ isOpen, onClose, onSuccess, log }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(log.coupon_code || null);

    const handleApprove = async () => {
        setLoading(true);
        try {
            const coupon = await fuelApi.approve(log.id);
            setGeneratedCoupon(coupon);
            success('Request approved! Coupon generated.', 'Success');
        } catch (error) {
            console.error(error);
            showError('Failed to approve request', 'Error');
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (generatedCoupon) onSuccess();
        else onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={generatedCoupon ? "Voucher BBM" : "Fuel Request Approval"}
            size="lg"
        >
            <div className="space-y-6">
                {!generatedCoupon ? (
                    <>
                        {/* Info Grid */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 grid grid-cols-2 gap-y-6 gap-x-8">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                                    <Hash size={12} /> Tracking Number
                                </div>
                                <p className="font-mono text-white text-sm">{log.tracking_number}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                                    <User size={12} /> Requested By
                                </div>
                                <p className="text-white text-sm font-medium">{log.requester_name}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                                    <Package size={12} /> Asset
                                </div>
                                <p className="text-white text-sm font-medium">{log.asset_name}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                                    <Fuel size={12} /> Requested Amount
                                </div>
                                <p className="text-blue-400 text-lg font-bold">
                                    {Number(log.requested_value).toLocaleString()} {log.request_type === 'volume' ? 'L' : 'IDR'}
                                </p>
                            </div>
                        </div>

                        {/* Odometer Proof */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-slate-300 text-sm font-medium">Odometer Check</p>
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono">
                                    {Number(log.odometer_reading).toLocaleString()} KM
                                </span>
                            </div>
                            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center group">
                                <img
                                    src={`${import.meta.env.VITE_API_URL || ''}${log.odometer_image_url}`}
                                    alt="Odometer"
                                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=Image+Error')}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                                    <a
                                        href={`${import.meta.env.VITE_API_URL || ''}${log.odometer_image_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 text-white transition-all shadow-xl"
                                        title="View Full Size"
                                    >
                                        <Maximize2 size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50">
                            <Button variant="ghost" onClick={onClose} disabled={loading} className="px-6">Close</Button>
                            <Button
                                onClick={handleApprove}
                                className="px-8 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Approve & Generate Coupon'}
                            </Button>
                        </div>
                    </>
                ) : (
                    /* Success State */
                    <div className="text-center py-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto ring-4 ring-blue-500/10 p-2 overflow-hidden">
                                <img src="/logo-sjs.png" alt="SJS Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 animate-bounce" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white tracking-tight">{log.asset_name}</h3>
                            <p className="text-slate-400">Voucher untuk pengisian BBM/Pencairan uang BBM</p>
                        </div>

                        <div className="bg-slate-950/50 p-8 rounded-[2rem] border-2 border-dashed border-slate-800 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-3 relative z-10">Voucher Code</p>
                            <p className="text-3xl font-mono font-black text-white tracking-widest relative z-10 drop-shadow-2xl">
                                {generatedCoupon}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 print:hidden">
                            <Button variant="outline" onClick={() => window.print()} className="px-8 border-slate-700 hover:bg-slate-800">
                                <Printer size={18} className="mr-2 opacity-50" /> Print Voucher
                            </Button>
                            <Button onClick={onSuccess} className="px-10 bg-blue-600 hover:bg-blue-500 text-white">
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
