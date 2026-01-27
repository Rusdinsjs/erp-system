
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, type MaintenanceSchedule, type CreateMaintenanceScheduleRequest } from '../../api/maintenance';
import { assetApi } from '../../api/assets';
import { Plus, Calendar, Gauge, Wrench, Clock, CheckCircle, Play } from 'lucide-react';
import {
    Card,
    Button,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Modal,
    StatusBadge,
    ActionIcon,
    TableSkeleton
} from '../../components/ui';
import { showToast } from '../../components/ui/Toast';

const MaintenanceSchedules: React.FC = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateMaintenanceScheduleRequest>({
        asset_id: '',
        title: '',
        description: '',
        interval_type: 'time',
        interval_value: 1,
        interval_unit: 'months',
        start_date: ''
    });

    // Queries
    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['maintenance-schedules'],
        queryFn: maintenanceApi.listSchedules
    });

    const { data: assetsData } = useQuery({
        queryKey: ['assets'],
        queryFn: () => assetApi.list({ page: 1, per_page: 100 })
    });

    const assets = assetsData?.data || [];

    // Mutations
    const createMutation = useMutation({
        mutationFn: maintenanceApi.createSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
            setIsCreateModalOpen(false);
            setFormData({
                asset_id: '', title: '', description: '',
                interval_type: 'time', interval_value: 1, interval_unit: 'months', start_date: ''
            });
            showToast('Maintenance schedule created successfully', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Failed to create schedule', 'error');
        }
    });

    const runMutation = useMutation({
        mutationFn: maintenanceApi.runSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
            showToast('Maintenance schedule triggered successfully', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Failed to trigger schedule', 'error');
        }
    });

    const handleRunSchedule = (id: string, title: string) => {
        if (confirm(`Run schedule "${title}" now? This will create a new maintenance task.`)) {
            runMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // Stats
    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter((s: MaintenanceSchedule) => s.is_active).length;
    const dueSoon = schedules.filter((s: MaintenanceSchedule) => {
        if (!s.next_run_date) return false;
        const next = new Date(s.next_run_date);
        const now = new Date();
        const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    }).length;

    return (
        <div className="p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Maintenance Schedules</h1>
                    <p className="text-gray-400 mt-2">Manage automated preventive maintenance tasks</p>
                </div>
                <Button
                    leftIcon={<Plus size={20} />}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="rounded-xl shadow-lg shadow-blue-500/20"
                >
                    Create Schedule
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="relative overflow-hidden group p-6 border-white/5 bg-gray-800/50">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Total Schedules</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{totalSchedules}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Wrench className="text-blue-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6 border-white/5 bg-gray-800/50">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Active</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{activeSchedules}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <CheckCircle className="text-emerald-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6 border-white/5 bg-gray-800/50">
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${dueSoon > 0 ? 'bg-amber-500/10' : 'bg-gray-500/10'}`} />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Due Soon (7 Days)</p>
                            <h3 className={`text-3xl font-bold mt-1 ${dueSoon > 0 ? 'text-amber-400' : 'text-white'}`}>
                                {dueSoon}
                            </h3>
                        </div>
                        <div className={`p-3 rounded-xl ${dueSoon > 0 ? 'bg-amber-500/20' : 'bg-gray-500/20'}`}>
                            <Clock className={dueSoon > 0 ? 'text-amber-400' : 'text-gray-400'} size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* List */}
            <Card className="overflow-hidden p-0 border-white/5 bg-gray-800/40 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
                    ) : (
                        <Table className="border-none">
                            <TableHead>
                                <TableRow className="bg-gray-900/50 border-white/5">
                                    <TableTh>Title</TableTh>
                                    <TableTh>Asset</TableTh>
                                    <TableTh>Frequency</TableTh>
                                    <TableTh>Last Run</TableTh>
                                    <TableTh>Next Due</TableTh>
                                    <TableTh>Status</TableTh>
                                    <TableTh align="center">Actions</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {schedules.map((schedule: MaintenanceSchedule) => (
                                    <TableRow key={schedule.id} className="hover:bg-gray-700/30 border-white/5">
                                        <TableTd>
                                            <div className="font-medium text-white">{schedule.title}</div>
                                            {schedule.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{schedule.description}</div>}
                                        </TableTd>
                                        <TableTd>
                                            <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-sm font-medium">
                                                {schedule.asset_name || 'Unknown'}
                                            </span>
                                        </TableTd>
                                        <TableTd>
                                            <div className="flex items-center text-gray-300">
                                                {schedule.interval_type === 'time' ? <Calendar size={14} className="mr-2 text-indigo-400" /> : <Gauge size={14} className="mr-2 text-orange-400" />}
                                                <span>Every {schedule.interval_value} {schedule.interval_unit}</span>
                                            </div>
                                        </TableTd>
                                        <TableTd>
                                            <span className="text-gray-400">{schedule.last_run_date || 'Never'}</span>
                                        </TableTd>
                                        <TableTd>
                                            {schedule.next_run_date ? (
                                                <span className={`${new Date(schedule.next_run_date) <= new Date()
                                                    ? 'text-red-400 font-bold'
                                                    : 'text-gray-300'
                                                    }`}>
                                                    {schedule.next_run_date}
                                                </span>
                                            ) : <span className="text-gray-500">Pending</span>}
                                        </TableTd>
                                        <TableTd>
                                            <StatusBadge status={schedule.is_active ? 'active' : 'inactive'} />
                                        </TableTd>
                                        <TableTd align="center">
                                            <div className="flex justify-center gap-2">
                                                <ActionIcon
                                                    variant="success"
                                                    title="Run Now"
                                                    onClick={() => handleRunSchedule(schedule.id, schedule.title)}
                                                    disabled={runMutation.isPending}
                                                >
                                                    <Play size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="default" title="Edit">
                                                    <Wrench size={16} />
                                                </ActionIcon>
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))}
                                {schedules.length === 0 && (
                                    <TableEmpty colSpan={7} message="No maintenance schedules found." />
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="New Maintenance Schedule"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Asset Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Asset</label>
                        <select
                            required
                            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none"
                            value={formData.asset_id}
                            onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                        >
                            <option value="">Select an Asset...</option>
                            {assets.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name} ({a.asset_number})</option>
                            ))}
                        </select>
                    </div>

                    {/* Title & Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
                        <input
                            type="text" required
                            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-600"
                            placeholder="e.g. Monthly Oil Change"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-600"
                            rows={3}
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Interval Config */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Frequency</label>
                            <div className="flex border border-gray-700 rounded-xl overflow-hidden">
                                <input
                                    type="number" min="1" required
                                    className="w-20 px-4 py-2.5 bg-gray-900 text-white outline-none border-r border-gray-700"
                                    value={formData.interval_value}
                                    onChange={e => setFormData({ ...formData, interval_value: parseInt(e.target.value) })}
                                />
                                <select
                                    className="flex-1 bg-gray-800 px-3 py-2.5 text-white outline-none appearance-none"
                                    value={formData.interval_unit}
                                    onChange={e => setFormData({
                                        ...formData,
                                        interval_unit: e.target.value,
                                        interval_type: ['km', 'hours'].includes(e.target.value) ? 'usage' : 'time'
                                    })}
                                >
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                    <option value="km">KM</option>
                                    <option value="hours">Hours</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Start Date</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                value={formData.start_date || ''}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional. Defaults to today.</p>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end space-x-3 border-t border-gray-800 mt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                        >
                            {createMutation.isPending ? 'Saving...' : 'Create Schedule'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MaintenanceSchedules;

