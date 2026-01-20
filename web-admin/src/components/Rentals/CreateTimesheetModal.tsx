import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { timesheetApi, type CreateTimesheetRequest } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import {
    Modal,
    Button,
    DateInput,
    NumberInput,
    Select,
    Textarea,
    useToast
} from '../ui';

interface CreateTimesheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    rentalId: string;
    onSuccess?: () => void;
}

export function CreateTimesheetModal({ isOpen, onClose, rentalId, onSuccess }: CreateTimesheetModalProps) {
    const { success, error: showError } = useToast();
    const queryClient = useQueryClient();

    // Fetch Rental Details to get Items
    const { data: rental } = useQuery({
        queryKey: ['rental', rentalId],
        queryFn: () => rentalApi.getRental(rentalId),
        enabled: !!rentalId && isOpen
    });

    const [formData, setFormData] = useState<Partial<CreateTimesheetRequest>>({
        work_date: new Date().toISOString().split('T')[0],
        operating_hours: 8,
        standby_hours: 0,
        breakdown_hours: 0,
        operation_status: 'working',
        production_unit: 'BCM',
        production_volume: 0,
        hm_km_start: 0,
        hm_km_end: 0
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateTimesheetRequest) => timesheetApi.create(data),
        onSuccess: () => {
            success('Timesheet created successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['timesheets', rentalId] });
            if (onSuccess) onSuccess();
            onClose();
            // Reset essential fields but keep item/date if needed
            setFormData(prev => ({
                ...prev,
                operating_hours: 8,
                production_volume: 0,
                // rental_item_id: prev.rental_item_id // Keep selected item
            }));
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to create timesheet', 'Error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!rentalId || !formData.work_date || !formData.rental_item_id) {
            showError('Missing required fields (Rental Item, Date, etc)', 'Validation Error');
            return;
        }

        const payload: CreateTimesheetRequest = {
            rental_id: rentalId,
            rental_item_id: formData.rental_item_id, // Mandatory
            work_date: formData.work_date,
            operating_hours: Number(formData.operating_hours || 0),
            standby_hours: Number(formData.standby_hours || 0),
            breakdown_hours: Number(formData.breakdown_hours || 0),
            operation_status: formData.operation_status || 'working',
            notes: formData.notes,
            work_description: formData.work_description,
            work_location: formData.work_location,
            hm_km_start: formData.hm_km_start ? Number(formData.hm_km_start) : undefined,
            hm_km_end: formData.hm_km_end ? Number(formData.hm_km_end) : undefined,
            start_time: formData.start_time,
            end_time: formData.end_time,
            standby_start_time: formData.standby_start_time,
            standby_end_time: formData.standby_end_time,
            breakdown_start_time: formData.breakdown_start_time,
            breakdown_end_time: formData.breakdown_end_time,
            production_volume: formData.production_volume ? Number(formData.production_volume) : undefined,
            production_unit: formData.production_unit
        };

        createMutation.mutate(payload);
    };

    const getDuration = (start?: string, end?: string): number => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
        if (diff < 0) diff += 24;
        return Math.max(0, Number(diff.toFixed(2)));
    };

    const handleChange = (field: keyof CreateTimesheetRequest, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Trigger calc only if time fields change
            if (field.includes('time')) {
                const shift = getDuration(newData.start_time, newData.end_time);
                const standby = getDuration(newData.standby_start_time, newData.standby_end_time);
                const breakdown = getDuration(newData.breakdown_start_time, newData.breakdown_end_time);

                newData.standby_hours = standby;
                newData.breakdown_hours = breakdown;
                newData.operating_hours = Math.max(0, Number((shift - standby - breakdown).toFixed(2)));
            }

            return newData;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Timesheet Entry">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Asset Selection */}
                <div>
                    <Select
                        label="Asset / Item"
                        placeholder="Select Asset..."
                        options={rental?.items?.map((i: any) => ({
                            value: i.id,
                            label: `${i.asset_name} (${i.asset_code})`
                        })) || []}
                        value={formData.rental_item_id}
                        onChange={(val) => handleChange('rental_item_id', val)}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DateInput
                        label="Work Date"
                        value={formData.work_date ? new Date(formData.work_date) : null}
                        onChange={(date) => handleChange('work_date', date ? date.toISOString().split('T')[0] : '')}
                        required
                    />
                    <Select
                        label="Status"
                        options={[
                            { value: 'working', label: 'Working' },
                            { value: 'standby', label: 'Standby' },
                            { value: 'breakdown', label: 'Breakdown' },
                            { value: 'off', label: 'Off / Weather' },
                        ]}
                        value={formData.operation_status || 'working'}
                        onChange={(val) => handleChange('operation_status', val)}
                    />
                </div>

                {/* Times Section */}
                <div className="bg-slate-900/30 p-4 rounded-lg space-y-4 border border-slate-800/50">
                    <h4 className="text-sm font-semibold text-slate-400">Time Details (Optional)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.start_time || ''}
                                onChange={(e) => handleChange('start_time', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.end_time || ''}
                                onChange={(e) => handleChange('end_time', e.target.value)}
                            />
                        </div>
                        <div className="col-span-2 hidden md:block"></div>

                        {/* Standby Times */}
                        <div>
                            <label className="block text-xs font-medium text-amber-500/80 mb-1">Standby Start</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.standby_start_time || ''}
                                onChange={(e) => handleChange('standby_start_time', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-amber-500/80 mb-1">Standby End</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.standby_end_time || ''}
                                onChange={(e) => handleChange('standby_end_time', e.target.value)}
                            />
                        </div>

                        {/* Breakdown Times */}
                        <div>
                            <label className="block text-xs font-medium text-red-400/80 mb-1">Breakdown Start</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.breakdown_start_time || ''}
                                onChange={(e) => handleChange('breakdown_start_time', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-red-400/80 mb-1">Breakdown End</label>
                            <input
                                type="time"
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                value={formData.breakdown_end_time || ''}
                                onChange={(e) => handleChange('breakdown_end_time', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NumberInput
                        label="Operating Hours"
                        value={formData.operating_hours}
                        onChange={(val) => handleChange('operating_hours', val)}
                    />
                    <NumberInput
                        label="Standby Hours"
                        value={formData.standby_hours}
                        onChange={(val) => handleChange('standby_hours', val)}
                    />
                    <NumberInput
                        label="Breakdown Hours"
                        value={formData.breakdown_hours}
                        onChange={(val) => handleChange('breakdown_hours', val)}
                    />

                    {(Number(formData.breakdown_hours) || 0) > 0 && (
                        <div className="col-span-1 md:col-span-3 mt-1 p-3 bg-red-900/20 border border-red-900/40 rounded-lg flex items-center gap-3">
                            <div className="shrink-0 p-2 bg-red-900/40 rounded-full">
                                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="text-xs">
                                <p className="font-semibold text-red-200">Work Order Trigger</p>
                                <p className="text-red-300/80">A High Priority breakdown Work Order will be automatically created.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <NumberInput
                        label="Production Volume (BCM)"
                        placeholder="0.00"
                        value={formData.production_volume}
                        onChange={(val) => handleChange('production_volume', val)}
                    />
                    <Select
                        label="Unit"
                        options={[
                            { value: 'BCM', label: 'BCM' },
                            { value: 'M3', label: 'M3' },
                            { value: 'TON', label: 'TON' },
                            { value: 'TRIP', label: 'TRIP' } // If trip based
                        ]}
                        value={formData.production_unit || 'BCM'}
                        onChange={(val) => handleChange('production_unit', val)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <NumberInput
                        label="HM/KM Start"
                        value={formData.hm_km_start}
                        onChange={(val) => handleChange('hm_km_start', val)}
                    />
                    <NumberInput
                        label="HM/KM End"
                        value={formData.hm_km_end}
                        onChange={(val) => handleChange('hm_km_end', val)}
                    />
                </div>

                <Textarea
                    label="Notes / Description"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={createMutation.isPending}>
                        Create Entry
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
