import React from 'react';
import { Modal, Button } from '../../components/ui';
import { type FuelLog } from '../../api/fuel';
import { Download, Maximize2, Hash, Calendar, CircleDollarSign, Fuel, Printer } from 'lucide-react';

interface FuelReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: FuelLog;
}

export const FuelReceiptModal: React.FC<FuelReceiptModalProps> = ({ isOpen, onClose, log }) => {
    if (!log.receipt_image_url) return null;

    const receiptUrl = `${import.meta.env.VITE_API_URL || ''}${log.receipt_image_url}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transaction Receipt"
            size="lg"
        >
            <div className="space-y-6">
                {/* Transaction Summary */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Hash size={12} /> Tracking #
                        </div>
                        <p className="font-mono text-white text-sm">{log.tracking_number}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Calendar size={12} /> Date
                        </div>
                        <p className="text-white text-sm">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                            <CircleDollarSign size={12} /> Actual Filled
                        </div>
                        <p className="text-green-400 font-bold">
                            {Number(log.actual_filled_amount).toLocaleString('id-ID')} IDR
                        </p>
                    </div>
                    <div className="space-y-1 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-500 text-[10px] uppercase tracking-widest">
                            <Fuel size={12} /> Actual Volume
                        </div>
                        <p className="text-blue-400 font-bold">
                            {log.actual_volume ? `${Number(log.actual_volume).toLocaleString()} L` : '-'}
                        </p>
                    </div>
                </div>

                {/* Receipt Image */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-300 text-sm font-medium">Captured Receipt</p>
                        <a
                            href={receiptUrl}
                            download
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                        >
                            <Download size={14} /> Download
                        </a>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-[3/4] flex items-center justify-center group">
                        <img
                            src={receiptUrl}
                            alt="Fuel Receipt"
                            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                            <a
                                href={receiptUrl}
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
                    <Button variant="ghost" onClick={onClose} className="px-6">Close</Button>
                    <Button
                        onClick={() => window.print()}
                        variant="outline"
                        className="px-6 border-slate-700 hover:bg-slate-800"
                    >
                        <Printer size={18} className="mr-2 opacity-50" /> Print Receipt
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// End of file
