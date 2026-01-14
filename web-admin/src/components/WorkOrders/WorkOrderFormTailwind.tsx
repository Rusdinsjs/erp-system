// WorkOrderForm - Pure Tailwind Version
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../../api/work-order';
import { assetApi } from '../../api/assets';
import { api } from '../../api/client';
import {
    Button,
    Select,
    Textarea,
    NumberInput,
    DateInput,
    LoadingOverlay,
    useToast,
} from '../ui';

interface WorkOrderFormProps {
    maintenanceId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function WorkOrderFormTailwind({ maintenanceId, onClose, onSuccess }: WorkOrderFormProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const isEdit = !!maintenanceId;

    // Form State
    const [formData, setFormData] = useState({
        asset_id: '',
        maintenance_type_id: '',
        scheduled_date: new Date(),
        description: '',
        cost: undefined as number | undefined,
        vendor_id: '',
        status: 'planned',
        findings: '',
        actions_taken: '',
        odometer_reading: undefined as number | undefined,
        location_id: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const res = await assetApi.list({ page: 1, per_page: 100 });
            return res.data;
        },
    });

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get('/locations');
            return res.data.map((l: any) => ({ value: l.id, label: l.name }));
        }
    });

    // Fetch Work Order if Edit
    const { data: workOrderData, isLoading: workOrderLoading } = useQuery({
        queryKey: ['work-order', maintenanceId],
        queryFn: () => workOrderApi.get(maintenanceId!),
        enabled: isEdit,
    });

    useEffect(() => {
        if (workOrderData) {
            const r = workOrderData;
            setFormData({
                asset_id: r.asset_id,
                maintenance_type_id: r.wo_type,
                scheduled_date: r.scheduled_date ? new Date(r.scheduled_date) : new Date(),
                description: r.problem_description || '',
                cost: r.estimated_cost,
                vendor_id: '',
                status: r.status,
                findings: r.work_performed || '',
                actions_taken: '',
                odometer_reading: undefined,
                location_id: '',
            });
        }
    }, [workOrderData]);

    const mutation = useMutation({
        mutationFn: (values: typeof formData) => {
            const payload: any = {
                asset_id: values.asset_id,
                wo_type: values.maintenance_type_id || 'maintenance',
                priority: 'medium',
                problem_description: values.description,
                scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString().split('T')[0] : undefined,
            };

            if (isEdit) {
                throw new Error("Generic update not implemented for Work Order yet");
            } else {
                return workOrderApi.create(payload);
            }
        },
        onSuccess: () => {
            success(`Work Order ${isEdit ? 'updated' : 'created'} successfully`, 'Success');
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            onSuccess();
        },
        onError: (error: any) => {
            showError(error.message || 'Failed to save Work Order', 'Error');
        },
    });

    const assetOptions = assetsData?.map(a => ({ value: a.id, label: a.name })) || [];

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.asset_id) newErrors.asset_id = 'Asset is required';
        if (!formData.description) newErrors.description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        mutation.mutate(formData);
    };

    const isLoading = mutation.isPending || workOrderLoading || assetsLoading;

    return (
        <div className="relative">
            <LoadingOverlay visible={isLoading} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Asset"
                    placeholder="Select asset..."
                    value={formData.asset_id}
                    onChange={(val) => updateField('asset_id', val)}
                    options={assetOptions}
                    error={errors.asset_id}
                    disabled={isEdit}
                    required
                />

                <DateInput
                    label="Scheduled Date"
                    value={formData.scheduled_date}
                    onChange={(date) => updateField('scheduled_date', date)}
                />

                <Textarea
                    label="Description"
                    placeholder="Work to be done"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    error={errors.description}
                    required
                />

                <Select
                    label="Location"
                    placeholder="Select location (if different from asset)"
                    value={formData.location_id}
                    onChange={(val) => updateField('location_id', val)}
                    options={locations}
                />

                <Select
                    label="Status"
                    value={formData.status}
                    onChange={(val) => updateField('status', val)}
                    options={[
                        { value: 'planned', label: 'Planned' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                />

                {/* Conditional fields for In Progress or Completed */}
                {(isEdit || formData.status !== 'planned') && (
                    <>
                        <Textarea
                            label="Findings"
                            placeholder="What was found?"
                            value={formData.findings}
                            onChange={(e) => updateField('findings', e.target.value)}
                            rows={2}
                        />
                        <Textarea
                            label="Actions Taken"
                            placeholder="What was done?"
                            value={formData.actions_taken}
                            onChange={(e) => updateField('actions_taken', e.target.value)}
                            rows={2}
                        />
                        <NumberInput
                            label="Cost"
                            prefix="Rp "
                            value={formData.cost}
                            onChange={(val) => updateField('cost', val)}
                            thousandSeparator
                        />
                    </>
                )}

                {/* Odometer for completed status */}
                {formData.status === 'completed' && (
                    <NumberInput
                        label="New Odometer Reading"
                        hint="Updates asset odometer"
                        value={formData.odometer_reading}
                        onChange={(val) => updateField('odometer_reading', val)}
                    />
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <Button variant="outline" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={mutation.isPending}>
                        Save
                    </Button>
                </div>
            </form>
        </div>
    );
}
