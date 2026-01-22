import React, { useState } from 'react';
import { Modal, Button, NumberInput, useToast } from '../../components/ui';
import { fuelApi, type FuelLog } from '../../api/fuel';
import { Camera, Fuel, CircleDollarSign, Hash } from 'lucide-react';

interface FuelCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    log: FuelLog;
}

export const FuelCompletionModal: React.FC<FuelCompletionModalProps> = ({ isOpen, onClose, onSuccess, log }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        actual_filled_amount: Number(log.requested_value), // Default to requested
        actual_volume: 0,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageFile) return showError('Receipt photo is required', 'Validation');

        setLoading(true);
        try {
            // Upload Receipt
            const uploadFormData = new FormData();
            uploadFormData.append('file', imageFile);
            const uploadRes = await import('../../api/http').then(m => m.api.post('/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }));
            const imageUrl = uploadRes.data.url;

            await fuelApi.complete(log.id, {
                actual_filled_amount: formData.actual_filled_amount,
                actual_volume: formData.actual_volume || undefined,
                receipt_image_url: imageUrl
            });

            success('Transaction completed successfully', 'Success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showError('Failed to complete transaction', 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Complete Fuel Transaction"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Coupon Info Header */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-widest mb-1">
                            <Hash size={12} />
                            Coupon Code
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-400">
                            {log.coupon_code}
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-800 hidden sm:block" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-widest mb-1">
                            <Fuel size={12} />
                            Requested Amount
                        </div>
                        <div className="text-xl font-bold text-white">
                            {Number(log.requested_value).toLocaleString()}
                            <span className="text-slate-500 text-sm ml-1 font-normal">
                                {log.request_type === 'volume' ? 'Liters' : 'IDR'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <CircleDollarSign size={16} className="text-green-500" />
                            Actual Cost (IDR) <span className="text-red-500">*</span>
                        </label>
                        <NumberInput
                            placeholder="e.g. 300,000"
                            required
                            value={formData.actual_filled_amount}
                            onChange={(val) => setFormData(prev => ({ ...prev, actual_filled_amount: Number(val) }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Fuel size={16} className="text-blue-500" />
                            Actual Volume (Liters)
                        </label>
                        <NumberInput
                            placeholder="Optional"
                            value={formData.actual_volume}
                            onChange={(val) => setFormData(prev => ({ ...prev, actual_volume: Number(val) }))}
                        />
                    </div>
                </div>

                {/* Receipt Upload Area */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Evidence: Receipt Photo <span className="text-red-500">*</span></label>
                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={handleFileChange}
                        />
                        <div className={`
                            border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-300
                            ${previewUrl
                                ? 'border-green-500/50 bg-green-500/5'
                                : 'border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 bg-slate-950/30'
                            }
                        `}>
                            {previewUrl ? (
                                <div className="space-y-4 text-center">
                                    <img src={previewUrl} alt="Preview" className="w-48 h-32 object-cover rounded-xl border border-white/20 shadow-lg mx-auto" />
                                    <p className="text-sm text-green-400 font-medium flex items-center justify-center gap-2">
                                        <Camera size={16} /> Update Receipt
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mb-4 group-hover:text-blue-400 group-hover:scale-110 transition-all">
                                        <Camera size={28} />
                                    </div>
                                    <p className="text-slate-300 font-medium">Capture or Upload Receipt</p>
                                    <p className="text-slate-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/50">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="px-6">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="px-10 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'Processing...' : 'Complete Transaction'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
