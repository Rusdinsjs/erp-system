import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Clock, Database, Activity, AlertCircle } from 'lucide-react';
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
            setFormData(prev => ({
                ...prev,
                operating_hours: 8,
                production_volume: 0,
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
            rental_item_id: formData.rental_item_id,
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
        if (!start || !end || start === '' || end === '') return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
        if (diff < 0) diff += 24;
        return Math.max(0, Number(diff.toFixed(2)));
    };

    const handleChange = (field: keyof CreateTimesheetRequest, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

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
        <Modal isOpen={isOpen} onClose={onClose} title="Operational Log Entry" size="xl">
            <form onSubmit={handleSubmit} className="space-y-8 relative">
                <div className="absolute top-0 right-0 -m-4 opacity-5 pointer-events-none">
                    <Database size={160} />
                </div>

                {/* Section: Identity */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={16} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Asset Identity</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="Target Asset instance"
                            placeholder="Select Deployed Asset..."
                            options={rental?.items?.map((i: any) => ({
                                value: i.id,
                                label: `${i.asset_name} [${i.asset_code}]`
                            })) || []}
                            value={formData.rental_item_id}
                            onChange={(val) => handleChange('rental_item_id', val)}
                            required
                            className="bg-black/20 border-white/5 rounded-2xl"
                        />
                        <DateInput
                            label="Operating Date"
                            value={formData.work_date ? new Date(formData.work_date) : null}
                            onChange={(date) => handleChange('work_date', date ? date.toISOString().split('T')[0] : '')}
                            required
                            className="bg-black/20 border-white/5 rounded-2xl"
                        />
                    </div>
                </div>

                {/* Section: Performance Meters */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Telemetry & Performance</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                        <NumberInput
                            label="Start Reading (HM/KM)"
                            value={formData.hm_km_start}
                            onChange={(val) => handleChange('hm_km_start', val)}
                            className="bg-black/40 border-white/5 rounded-2xl"
                        />
                        <NumberInput
                            label="End Reading (HM/KM)"
                            value={formData.hm_km_end}
                            onChange={(val) => handleChange('hm_km_end', val)}
                            className="bg-black/40 border-white/5 rounded-2xl"
                        />
                        <div className="flex flex-col justify-end">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                                <span className="text-[10px] font-bold text-emerald-500/60 uppercase block">Total Utilization</span>
                                <span className="text-xl font-black text-emerald-400 tracking-tighter">
                                    {(Number(formData.hm_km_end || 0) - Number(formData.hm_km_start || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Time Logs */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Temporal Breakdown</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
                        {/* Working Window */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> Working window
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase block mb-1.5 ml-1">Start</span>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                        value={formData.start_time || ''}
                                        onChange={(e) => handleChange('start_time', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase block mb-1.5 ml-1">End</span>
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                        value={formData.end_time || ''}
                                        onChange={(e) => handleChange('end_time', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 h-full items-end">
                            <NumberInput
                                label="Manual Op Hours"
                                value={formData.operating_hours}
                                onChange={(val) => handleChange('operating_hours', val)}
                                className="bg-white/5 border-white/10 rounded-2xl"
                            />
                            <Select
                                label="System Status"
                                options={[
                                    { value: 'working', label: 'WORKING' },
                                    { value: 'standby', label: 'STANDBY' },
                                    { value: 'breakdown', label: 'BREAKDOWN' },
                                    { value: 'off', label: 'OFF / WEATHER' },
                                ]}
                                value={formData.operation_status || 'working'}
                                onChange={(val) => handleChange('operation_status', val)}
                                className="bg-white/5 border-white/10 rounded-2xl"
                            />
                        </div>

                        {/* Exceptions (Standby/BD) */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-6 mt-2">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Standby window
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
                                        value={formData.standby_start_time || ''}
                                        onChange={(e) => handleChange('standby_start_time', e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
                                        value={formData.standby_end_time || ''}
                                        onChange={(e) => handleChange('standby_end_time', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Breakdown window
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all"
                                        value={formData.breakdown_start_time || ''}
                                        onChange={(e) => handleChange('breakdown_start_time', e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all"
                                        value={formData.breakdown_end_time || ''}
                                        onChange={(e) => handleChange('breakdown_end_time', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {(Number(formData.breakdown_hours || 0)) > 0 && (
                        <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="p-2 bg-rose-500/20 rounded-xl">
                                <AlertCircle size={20} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-rose-200 uppercase tracking-tight">Automatic Work Order Trigger</p>
                                <p className="text-[11px] text-rose-300/60 font-medium">Breakdown hours detected. A High-Priority Maintenance Ticket will be generated upon submission.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section: Production */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Database size={16} className="text-purple-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Output Metrics</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                        <NumberInput
                            label="Production Volume"
                            placeholder="0.00"
                            value={formData.production_volume}
                            onChange={(val) => handleChange('production_volume', val)}
                            className="bg-black/40 border-white/5 rounded-2xl"
                        />
                        <Select
                            label="Measurement Unit"
                            options={[
                                { value: 'BCM', label: 'BCM - Bank Cubic Meter' },
                                { value: 'M3', label: 'M3 - Cubic Meter' },
                                { value: 'TON', label: 'TON - Tonnage' },
                                { value: 'TRIP', label: 'TRIP - Cycle Count' }
                            ]}
                            value={formData.production_unit || 'BCM'}
                            onChange={(val) => handleChange('production_unit', val)}
                            className="bg-black/40 border-white/5 rounded-2xl"
                        />
                    </div>
                </div>

                <Textarea
                    label="Field Notes & Observations"
                    placeholder="Describe specific activities, conditions, or issues encountered during shift..."
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="bg-black/20 border-white/5 rounded-2xl min-h-[100px]"
                />

                <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                    <Button variant="ghost" type="button" onClick={onClose} className="rounded-xl px-6">
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        loading={createMutation.isPending}
                        className="rounded-xl px-10 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[11px]"
                    >
                        Submit Operational Log
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
