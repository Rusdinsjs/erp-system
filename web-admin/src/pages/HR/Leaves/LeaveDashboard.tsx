import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

// Replaced PageHeader with simple div
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge, StatusBadge } from '../../../components/ui/Badge'; // Import StatusBadge
import { Modal } from '../../../components/ui/Modal'; // Use Modal instead of Dialog
import { Table, TableHead, TableRow, TableTh, TableBody, TableTd } from '../../../components/ui/Table';
import { PageLoading } from '../../../components/ui/Loading'; // Use PageLoading
import { DateInput } from '../../../components/ui/DateInput';

import { getMyLeaves, getPendingLeaves, requestLeave, approveLeave, rejectLeave } from '../../../api/leaves';
import { profileApi } from '../../../api/profile';

// Helper to calculate days diff
const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = dayjs(start);
    const e = dayjs(end);
    const diff = e.diff(s, 'day') + 1;
    return diff > 0 ? diff : 0;
};

export default function LeaveDashboard() {
    const queryClient = useQueryClient();
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    // Use uncontrolled tabs, but we track activeTab for queries if needed.
    // However, the new Tabs component supports controlled.
    const [activeTab, setActiveTab] = useState('my-leaves');

    // Profile for employee_id
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileApi.getProfile,
    });

    // Form State
    const [formData, setFormData] = useState({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
    });

    // Queries
    const { data: myLeaves, isLoading: loadingMy } = useQuery({
        queryKey: ['my-leaves'],
        queryFn: getMyLeaves,
    });

    const { data: pendingLeaves } = useQuery({
        queryKey: ['pending-leaves'],
        queryFn: getPendingLeaves,
        enabled: activeTab === 'approvals', // Only fetch if tab active
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: requestLeave,
        onSuccess: () => {
            toast.success('Leave request submitted successfully');
            setIsRequestModalOpen(false);
            setFormData({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to submit request');
        },
    });

    const approveMutation = useMutation({
        mutationFn: approveLeave,
        onSuccess: () => {
            toast.success('Leave request approved');
            queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeave(id, reason),
        onSuccess: () => {
            toast.success('Leave request rejected');
            queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Check if profile has employee data. 
        // The User type from profileApi might need verification if it has nested employee.
        // Assuming current structure based on previous errors: User doesn't guarantee employee.
        const employeeId = (profile as any)?.employee_id;

        if (!employeeId) {
            toast.error('Employee record not found. Please contact HR.');
            return;
        }

        const days = calculateDays(formData.start_date, formData.end_date);

        createMutation.mutate({
            employee_id: employeeId,
            leave_type: formData.leave_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            days_count: days,
            reason: formData.reason,
        });
    };

    if (loadingMy && activeTab === 'my-leaves') return <PageLoading />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cuti & Izin</h1>
                    <p className="text-slate-400">Manage leave requests and approvals</p>
                </div>
                <Button onClick={() => setIsRequestModalOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Request Leave
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="my-leaves">My Requests</TabsTrigger>
                    <TabsTrigger value="approvals">Approvals <Badge variant="default" className="ml-2">{pendingLeaves?.length || 0}</Badge></TabsTrigger>
                </TabsList>

                <TabsContent value="my-leaves" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Request History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-800">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableTh>Type</TableTh>
                                            <TableTh>Start Date</TableTh>
                                            <TableTh>End Date</TableTh>
                                            <TableTh>Days</TableTh>
                                            <TableTh>Reason</TableTh>
                                            <TableTh>Status</TableTh>
                                            <TableTh>Applied On</TableTh>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {myLeaves?.length === 0 ? (
                                            <TableRow>
                                                <TableTd colSpan={7} className="text-center py-8 text-slate-500">
                                                    No leave requests found
                                                </TableTd>
                                            </TableRow>
                                        ) : (
                                            myLeaves?.map((leave) => (
                                                <TableRow key={leave.id}>
                                                    <TableTd className="capitalize">{leave.leave_type}</TableTd>
                                                    <TableTd>{dayjs(leave.start_date).format('DD MMM YYYY')}</TableTd>
                                                    <TableTd>{dayjs(leave.end_date).format('DD MMM YYYY')}</TableTd>
                                                    <TableTd>{leave.days_count} Days</TableTd>
                                                    <TableTd>{leave.reason || '-'}</TableTd>
                                                    <TableTd><StatusBadge status={leave.status} /></TableTd>
                                                    <TableTd>{dayjs(leave.created_at).format('DD MMM YYYY')}</TableTd>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="approvals" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approvals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-slate-800">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableTh>Employee</TableTh>
                                            <TableTh>Type</TableTh>
                                            <TableTh>Dates</TableTh>
                                            <TableTh>Reason</TableTh>
                                            <TableTh>Actions</TableTh>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingLeaves?.length === 0 ? (
                                            <TableRow>
                                                <TableTd colSpan={5} className="text-center py-8 text-slate-500">
                                                    No pending approvals
                                                </TableTd>
                                            </TableRow>
                                        ) : (
                                            pendingLeaves?.map((leave) => (
                                                <TableRow key={leave.id}>
                                                    <TableTd>
                                                        <div className="font-medium text-white">{leave.employee_name}</div>
                                                    </TableTd>
                                                    <TableTd className="capitalize">{leave.leave_type}</TableTd>
                                                    <TableTd>
                                                        <div className="flex flex-col text-xs">
                                                            <span>{dayjs(leave.start_date).format('DD MMM')} - {dayjs(leave.end_date).format('DD MMM YYYY')}</span>
                                                            <span className="text-slate-500">({leave.days_count} Days)</span>
                                                        </div>
                                                    </TableTd>
                                                    <TableTd>{leave.reason || '-'}</TableTd>
                                                    <TableTd>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                                                onClick={() => approveMutation.mutate(leave.id)}
                                                            >
                                                                <Check size={16} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => {
                                                                    const reason = prompt('Reason for rejection?');
                                                                    if (reason) rejectMutation.mutate({ id: leave.id, reason });
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableTd>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Request Modal */}
            <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Minta Cuti / Izin">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Tipe Cuti</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-950/50 border border-slate-700 rounded-md text-white focus:outline-none focus:border-cyan-500"
                            value={formData.leave_type}
                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                        >
                            <option value="annual">Cuti Tahunan (Annual Leave)</option>
                            <option value="sick">Sakit (Sick Leave)</option>
                            <option value="unpaid">Izin (Unpaid Leave)</option>
                            <option value="maternity">Maternity/Paternity</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <DateInput
                            label="Start Date"
                            required
                            value={formData.start_date}
                            onChange={(val) => setFormData({ ...formData, start_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                        />
                        <DateInput
                            label="End Date"
                            required
                            value={formData.end_date}
                            onChange={(val) => setFormData({ ...formData, end_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Total Hari</label>
                        <div className="p-2 border border-slate-800 rounded-md bg-slate-900 text-slate-400">
                            {calculateDays(formData.start_date, formData.end_date)} Hari
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300">Alasan</label>
                        <textarea
                            className="w-full px-4 py-2 bg-slate-950/50 border border-slate-700 rounded-md text-white focus:outline-none focus:border-cyan-500 min-h-[80px]"
                            placeholder="Jelaskan alasan cuti..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsRequestModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending}>
                            Submit Request
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
