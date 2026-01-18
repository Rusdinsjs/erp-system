import React, { useState } from 'react';
import { Modal, Button, NumberInput, useToast } from '../../components/ui';
import { fuelApi, type FuelLog } from '../../api/fuel';
import { Camera } from 'lucide-react';

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

            success('Transaction completed', 'Success');
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
        <Modal isOpen={isOpen} onClose={onClose} title="Complete Fuel Transaction">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-slate-800 rounded mb-4 text-sm">
                    <p className="text-slate-400">Coupon Code: <span className="text-white font-mono font-bold">{log.coupon_code}</span></p>
                    <p className="text-slate-400">Requested: <span className="text-white">{Number(log.requested_value).toLocaleString()} {log.request_type === 'volume' ? 'L' : 'IDR'}</span></p>
                </div>

                <NumberInput
                    label="Actual Cost (IDR)"
                    required
                    value={formData.actual_filled_amount}
                    onChange={(val) => setFormData(prev => ({ ...prev, actual_filled_amount: Number(val) }))}
                />

                <NumberInput
                    label="Actual Volume (Liters) - Optional"
                    value={formData.actual_volume}
                    onChange={(val) => setFormData(prev => ({ ...prev, actual_volume: Number(val) }))}
                />

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Receipt Photo</label>
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="relative overflow-hidden">
                            <Camera size={18} className="mr-2" />
                            Upload Receipt
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                        </Button>
                        {previewUrl && (
                            <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-600">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Processing...' : 'Complete Transaction'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
