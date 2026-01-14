// WorkOrderForm - Pure Tailwind
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../api/work-order';
import { assetApi } from '../api/assets';
import { api } from '../api/client';
import {
    Button,
    Select,
    Textarea,

    NumberInput,
    DateInput,
    LoadingOverlay,
    useToast
} from '../components/ui';

interface WorkOrderFormProps {
    maintenanceId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormState {
    asset_id: string;
    maintenance_type_id: string;
    scheduled_date: Date | null;
    description: string;
    cost: number | '';
    vendor_id: string;
    status: string;
    findings: string;
    actions_taken: string;
    odometer_reading: number | '';
    location_id: string;
}

const initialFormState: FormState = {
    asset_id: '',
    maintenance_type_id: '',
    scheduled_date: new Date(),
    description: '',
    cost: '',
    vendor_id: '',
    status: 'planned',
    findings: '',
    actions_taken: '',
    odometer_reading: '',
    location_id: '',
};

export function WorkOrderForm({ maintenanceId, onClose, onSuccess }: WorkOrderFormProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const isEdit = !!maintenanceId;

    const [form, setForm] = useState<FormState>(initialFormState);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const res = await assetApi.list({ page: 1, per_page: 100 });
            return res.data;
        },
    });

    const assetOptions = assetsData?.map(a => ({ value: a.id, label: a.name })) || [];

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get('/locations');
            return res.data.map((l: any) => ({ value: l.id, label: l.name }));
        }
    });

    // Fetch Maintenance Record if Edit
    const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
        queryKey: ['work-order', maintenanceId],
        queryFn: () => workOrderApi.get(maintenanceId!),
        enabled: isEdit,
    });

    useEffect(() => {
        if (maintenanceData) {
            const r = maintenanceData;
            setForm({
                asset_id: r.asset_id,
                maintenance_type_id: r.wo_type || '', // Assuming wo_type exists
                scheduled_date: r.scheduled_date ? new Date(r.scheduled_date) : new Date(),
                description: r.problem_description || '',
                cost: r.estimated_cost ?? '',
                vendor_id: '',
                status: r.status,
                findings: r.work_performed || '',
                actions_taken: '',
                odometer_reading: '',
                location_id: '',
            });
        }
    }, [maintenanceData]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.asset_id) newErrors.asset_id = 'Asset is required';
        if (!form.description) newErrors.description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const payload: any = {
                asset_id: form.asset_id,
                wo_type: form.maintenance_type_id || 'maintenance', // Default if empty
                priority: 'medium',
                problem_description: form.description,
                scheduled_date: form.scheduled_date ? form.scheduled_date.toISOString().split('T')[0] : undefined,
                status: form.status,
                // ... other mappings based on original form logic
            };

            if (isEdit) {
                // return workOrderApi.update(maintenanceId!, payload);
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
        onError: (err: any) => {
            showError(err.message || 'Failed to save Work Order', 'Error');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            mutation.mutate();
        }
    };

    const handleChange = (key: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    };

    const isLoading = mutation.isPending || maintenanceLoading || assetsLoading;

    return (
        <div className="relative">
            <LoadingOverlay visible={isLoading} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Asset"
                    placeholder="Select asset"
                    options={assetOptions}
                    value={form.asset_id}
                    onChange={(val) => handleChange('asset_id', val)}
                    disabled={isEdit}
                    error={errors.asset_id}
                />

                <DateInput
                    label="Scheduled Date"
                    value={form.scheduled_date}
                    onChange={(date) => handleChange('scheduled_date', date)}
                />

                <Textarea
                    label="Description"
                    placeholder="Work to be done"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    error={errors.description}
                />

                <Select
                    label="Location"
                    placeholder="Select location (if different)"
                    options={locations}
                    value={form.location_id}
                    onChange={(val) => handleChange('location_id', val)}
                />

                <Select
                    label="Status"
                    options={[
                        { value: 'planned', label: 'Planned' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    value={form.status}
                    onChange={(val) => handleChange('status', val)}
                />

                {(isEdit || form.status !== 'planned') && (
                    <>
                        <Textarea
                            label="Findings"
                            placeholder="What was found?"
                            value={form.findings}
                            onChange={(e) => handleChange('findings', e.target.value)}
                        />
                        <Textarea
                            label="Actions Taken"
                            placeholder="What was done?"
                            value={form.actions_taken}
                            onChange={(e) => handleChange('actions_taken', e.target.value)}
                        />
                        <NumberInput
                            label="Cost"
                            placeholder="0.00"
                            prefix="$"
                            value={form.cost}
                            onChange={(val) => handleChange('cost', val)}
                        />
                    </>
                )}

                {form.status === 'completed' && (
                    <NumberInput
                        label="New Odometer Reading"
                        placeholder="Current reading"
                        value={form.odometer_reading}
                        onChange={(val) => handleChange('odometer_reading', val)}
                    />
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={mutation.isPending}>Save</Button>
                </div>
            </form>
        </div>
    );
}
