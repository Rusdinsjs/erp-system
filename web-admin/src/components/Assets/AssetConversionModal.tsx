// AssetConversionModal Component - Pure Tailwind
import React, { useEffect, useState } from 'react';
import { categoryApi, type Category } from '../../api/category';
import { conversionApi } from '../../api/conversion';
import {
    Modal,
    Input,
    Select,
    NumberInput,
    Textarea,
    Button,
    LoadingOverlay,
    useToast,
} from '../ui';

interface AssetConversionModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess: () => void;
}

export const AssetConversionModal: React.FC<AssetConversionModalProps> = ({ opened, onClose, assetId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const { success, error: showError } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        to_category_id: '',
        conversion_cost: 0,
        cost_treatment: 'capitalize', // 'capitalize' | 'expense'
        reason: '',
        target_specifications: {},
    });

    useEffect(() => {
        if (opened) {
            fetchCategories();
        }
    }, [opened]);

    const fetchCategories = async () => {
        try {
            const data = await categoryApi.list();
            setCategories(data);
        } catch (error) {
            showError('Failed to fetch categories', 'Error');
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (formData.title.length < 3) {
            showError('Title must be at least 3 characters', 'Validation Error');
            return;
        }
        if (!formData.to_category_id) {
            showError('Target category is required', 'Validation Error');
            return;
        }
        if (formData.reason.length < 10) {
            showError('Reason must be at least 10 characters', 'Validation Error');
            return;
        }

        setLoading(true);
        try {
            await conversionApi.createRequest(assetId, {
                asset_id: assetId,
                title: formData.title,
                to_category_id: formData.to_category_id,
                conversion_cost: formData.conversion_cost,
                cost_treatment: formData.cost_treatment as 'capitalize' | 'expense',
                reason: formData.reason,
                target_specifications: formData.target_specifications,
            });
            success('Conversion request submitted', 'Success');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                title: '',
                to_category_id: '',
                conversion_cost: 0,
                cost_treatment: 'capitalize',
                reason: '',
                target_specifications: {},
            });
        } catch (error: any) {
            showError(error.response?.data?.error || 'Failed to submit request', 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="Request Asset Conversion">
            <div className="relative">
                <LoadingOverlay visible={loading} />
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Request Title"
                        placeholder="e.g., Convert to IT Equipment"
                        required
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                    />

                    <Select
                        label="Target Category"
                        placeholder="Select category"
                        options={categories.map((c) => ({
                            value: c.id,
                            label: c.name
                        }))}
                        value={formData.to_category_id}
                        onChange={(val) => handleChange('to_category_id', val)}
                    />

                    <NumberInput
                        label="Conversion Cost"
                        placeholder="0.00"
                        min={0}
                        value={formData.conversion_cost}
                        onChange={(val) => handleChange('conversion_cost', val)}
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Cost Treatment</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="cost_treatment"
                                    value="capitalize"
                                    checked={formData.cost_treatment === 'capitalize'}
                                    onChange={(e) => handleChange('cost_treatment', e.target.value)}
                                    className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-700"
                                />
                                <span className="text-sm text-slate-300">Capitalize (Add to Asset Value)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="cost_treatment"
                                    value="expense"
                                    checked={formData.cost_treatment === 'expense'}
                                    onChange={(e) => handleChange('cost_treatment', e.target.value)}
                                    className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-700"
                                />
                                <span className="text-sm text-slate-300">Expense (Maintenance Cost)</span>
                            </label>
                        </div>
                    </div>

                    <Textarea
                        label="Reason"
                        placeholder="Why is this conversion needed?"
                        required
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                        <Button type="submit">Submit Request</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
