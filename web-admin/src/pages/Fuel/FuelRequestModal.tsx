import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, NumberInput, useToast } from '../../components/ui';
import { api } from '../../api/http';
import { assetApi, type Asset } from '../../api/assets';
import { fuelApi } from '../../api/fuel';
import { Camera } from 'lucide-react';

interface FuelRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const FuelRequestModal: React.FC<FuelRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);

    const [formData, setFormData] = useState({
        asset_id: '',
        odometer_reading: 0,
        request_type: 'amount' as 'amount' | 'volume',
        requested_value: 0
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadAssets();
        }
    }, [isOpen]);

    const loadAssets = async () => {
        try {
            const data = await assetApi.list({ page: 1, limit: 1000 } as any);
            const list = (data as any).data || data;
            setAssets(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error(error);
            showError('Failed to load assets', 'Error');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.asset_id) return showError('Please select an asset', 'Validation');
        if (!imageFile) return showError('Odometer photo is required', 'Validation');

        setLoading(true);
        try {
            console.log('Starting submission...');
            const uploadFormData = new FormData();
            uploadFormData.append('file', imageFile);

            console.log('Uploading image...');
            const uploadRes = await api.post('/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('Upload response:', uploadRes);

            // Handle both structure possibilities just in case
            const imageUrl = uploadRes.data?.data?.url || uploadRes.data?.url;
            console.log('Image URL:', imageUrl);

            if (!imageUrl) throw new Error('Failed to get image URL from upload response');

            const payload = {
                ...formData,
                odometer_image_url: imageUrl,
            };
            console.log('Submitting payload:', payload);

            await fuelApi.request(payload);

            success('Fuel request submitted successfully', 'Success');
            onSuccess();
            setFormData({
                asset_id: '',
                odometer_reading: 0,
                request_type: 'amount',
                requested_value: 0
            });
            setImageFile(null);
            setPreviewUrl(null);
            onClose();
        } catch (error: any) {
            console.error('Full submission error:', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to submit request';
            showError(msg, 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Fuel Request">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Asset"
                    placeholder="Select Asset"
                    options={assets.map(a => ({ value: a.id, label: `${a.name} (${a.asset_code})` }))}
                    value={formData.asset_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, asset_id: val }))}
                />

                <NumberInput
                    label="Current Odometer (KM)"
                    value={formData.odometer_reading}
                    onChange={(val) => setFormData(prev => ({ ...prev, odometer_reading: Number(val) }))}
                    min={0}
                />

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Odometer Photo</label>
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="relative overflow-hidden">
                            <Camera size={18} className="mr-2" />
                            Capture / Upload
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

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Request Type"
                        options={[
                            { value: 'amount', label: 'By Amount (IDR)' },
                            { value: 'volume', label: 'By Volume (Liters)' }
                        ]}
                        value={formData.request_type}
                        onChange={(val) => setFormData(prev => ({ ...prev, request_type: val as any }))}
                    />
                    <NumberInput
                        label={formData.request_type === 'amount' ? 'Amount (IDR)' : 'Volume (L)'}
                        value={formData.requested_value}
                        onChange={(val) => setFormData(prev => ({ ...prev, requested_value: Number(val) }))}
                        min={0}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
