// WorkOrderForm - Pure Tailwind Version
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../../api/work-order';
import { assetApi } from '../../api/assets';
import { api } from '../../api/http';
import {
    Button,
    Select,
    Textarea,
    NumberInput,
    DateInput,
    LoadingOverlay,
    useToast,
} from '../ui';
import { ClipboardList, Activity, FileText, CreditCard, ArrowRight } from 'lucide-react';

interface WorkOrderFormProps {
    maintenanceId?: string | null;
    initialAssetId?: string | null;
    initialType?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function WorkOrderForm({ maintenanceId, initialAssetId, initialType, onClose, onSuccess }: WorkOrderFormProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const isEdit = !!maintenanceId;

    // Form State
    const [formData, setFormData] = useState({
        asset_id: initialAssetId || '',
        maintenance_type_id: initialType || '',
        scheduled_date: new Date(),
        description: '',
        cost: undefined as number | undefined,
        vendor_id: '',
        status: 'planned',
        findings: '',
        actions_taken: '',
        odometer_reading: undefined as number | undefined,
        location_id: '',
        target_category_id: '',
        conversion_notes: '',
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

    // Fetch Categories
    const { data: categoryOptions = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('/categories');
            return res.data.map((c: any) => ({ value: c.id, label: c.name }));
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
                target_category_id: (r as any).target_category_id || '',
                conversion_notes: (r as any).conversion_notes || '',
            });
        }
    }, [workOrderData]);

    const mutation = useMutation({
        mutationFn: async (values: typeof formData) => {
            const payload: any = {
                asset_id: values.asset_id,
                wo_type: values.maintenance_type_id || 'maintenance',
                priority: 'medium',
                problem_description: values.description,
                scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString().split('T')[0] : undefined,
                target_category_id: values.maintenance_type_id === 'conversion' ? values.target_category_id : undefined,
                conversion_notes: values.maintenance_type_id === 'conversion' ? values.conversion_notes : undefined,
            };

            if (isEdit) {
                const res = await api.put(`/work-orders/${maintenanceId}`, payload);
                return res.data;
            } else {
                const res = await workOrderApi.create(payload);
                return res.data;
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

    const assetOptions = useMemo(() => {
        if (!assetsData) return [];
        return assetsData
            .filter((a: any) => {
                if (isEdit && a.id === formData.asset_id) return true;
                const blockedStatuses = ['under_maintenance', 'under_repair', 'maintenance', 'repair', 'under_conversion'];
                return !blockedStatuses.includes(a.status.toLowerCase());
            })
            .map((a: any) => ({ value: a.id, label: a.name }));
    }, [assetsData, isEdit, formData.asset_id]);

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
        <div className="relative min-h-[500px]">
            <LoadingOverlay visible={isLoading} />

            {/* Subtle Background Glows */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                {/* Section 1: Core Information */}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-cyan-500/20 rounded-2xl">
                            <ClipboardList className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Core Information</h3>
                            <p className="text-sm text-slate-400">Specify the asset and maintenance schedule</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <Select
                                label="Asset"
                                placeholder="Select asset..."
                                value={formData.asset_id}
                                onChange={(val: string) => updateField('asset_id', val)}
                                options={assetOptions}
                                error={errors.asset_id}
                                disabled={isEdit}
                                required
                                className="bg-black/20 border-white/5"
                            />

                            <Select
                                label="Work Order Type"
                                placeholder="Select type"
                                options={[
                                    { value: 'preventive', label: 'Preventive Maintenance' },
                                    { value: 'corrective', label: 'Corrective / Repair' },
                                    { value: 'inspection', label: 'Routine Inspection' },
                                    { value: 'emergency', label: 'Emergency Response' },
                                    { value: 'upgrade', label: 'Asset Upgrade' },
                                    { value: 'conversion', label: 'Asset Conversion' },
                                ]}
                                value={formData.maintenance_type_id}
                                onChange={(val: string) => updateField('maintenance_type_id', val)}
                                className="bg-black/20 border-white/5"
                            />
                        </div>

                        <div className="space-y-6">
                            <DateInput
                                label="Scheduled Date"
                                value={formData.scheduled_date}
                                onChange={(date: Date | null) => updateField('scheduled_date', date)}
                                className="bg-black/20 border-white/5"
                            />

                            <Select
                                label="Primary Location"
                                placeholder="Select location (if specific)"
                                value={formData.location_id}
                                onChange={(val: string) => updateField('location_id', val)}
                                options={locations}
                                className="bg-black/20 border-white/5"
                            />
                        </div>
                    </div>

                    {/* Conversion Specific Fields */}
                    {formData.maintenance_type_id === 'conversion' && (
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <Select
                                label="Target Category"
                                placeholder="Select new category..."
                                value={formData.target_category_id}
                                onChange={(val: string) => updateField('target_category_id', val)}
                                options={categoryOptions}
                                required
                                className="bg-black/20 border-white/5"
                            />
                            <div className="flex items-end pb-1 text-sm text-cyan-400 italic">
                                <ArrowRight size={16} className="mr-2" />
                                Asset category will be updated upon WO completion
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 2: Job Description */}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-amber-500/20 rounded-2xl">
                            <FileText className="text-amber-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Job Description</h3>
                            <p className="text-sm text-slate-400">Detailed instructions for the maintenance team</p>
                        </div>
                    </div>

                    <Textarea
                        label="Problem / Work Description"
                        placeholder="Describe the issues or work to be performed in detail..."
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('description', e.target.value)}
                        rows={4}
                        error={errors.description}
                        required
                        className="bg-black/20 border-white/5 resize-none"
                    />
                </div>

                {/* Section 3: Execution & Status (Progressive Disclosure) */}
                <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl">
                            <Activity className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">Progress & Results</h3>
                            <p className="text-sm text-slate-400">Update current status and capture findings</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="max-w-md">
                            <Select
                                label="Execution Status"
                                value={formData.status}
                                onChange={(val: string) => updateField('status', val)}
                                options={[
                                    { value: 'planned', label: 'Planned / Scheduled' },
                                    { value: 'in_progress', label: 'Currently In Progress' },
                                    { value: 'completed', label: 'Finish & Closed' },
                                    { value: 'cancelled', label: 'Cancelled / Void' },
                                ]}
                                disabled={!isEdit}
                                className={`bg-black/20 border-white/5 font-medium ${formData.status === 'completed' ? 'text-emerald-400' : formData.status === 'in_progress' ? 'text-amber-400' : ''}`}
                            />
                        </div>

                        {(isEdit || formData.status !== 'planned') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <Textarea
                                    label="Technical Findings"
                                    placeholder="What was discovered during inspection?"
                                    value={formData.findings}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('findings', e.target.value)}
                                    rows={3}
                                    className="bg-black/20 border-white/5"
                                />
                                <Textarea
                                    label="Actions Taken"
                                    placeholder="List the repairs or changes made..."
                                    value={formData.actions_taken}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('actions_taken', e.target.value)}
                                    rows={3}
                                    className="bg-black/20 border-white/5"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 4: Validation & Costs (Conditional) */}
                {(formData.status === 'completed' || isEdit) && (
                    <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-500/20 rounded-2xl">
                                <CreditCard className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Validation & Costs</h3>
                                <p className="text-sm text-slate-400">Final metrics and financial impact</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <NumberInput
                                label="Actual Maintenance Cost"
                                prefix="Rp "
                                value={formData.cost}
                                onChange={(val: number | undefined) => updateField('cost', val)}
                                thousandSeparator
                                className="bg-black/20 border-white/5 text-emerald-400 font-semibold"
                            />

                            {formData.status === 'completed' && (
                                <NumberInput
                                    label="Completion Odometer"
                                    hint="Will update the asset's current meter"
                                    value={formData.odometer_reading}
                                    onChange={(val: number | undefined) => updateField('odometer_reading', val)}
                                    className="bg-black/20 border-white/5"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={onClose}
                        className="hover:bg-white/5 text-slate-400 rounded-2xl px-8"
                    >
                        Discard Changes
                    </Button>
                    <Button
                        type="submit"
                        loading={mutation.isPending}
                        className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-[0_8px_32px_rgba(8,145,178,0.3)] rounded-2xl px-12 py-6 h-auto text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        rightIcon={<ArrowRight size={20} />}
                    >
                        {isEdit ? 'Update Work Order' : 'Release Work Order'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
