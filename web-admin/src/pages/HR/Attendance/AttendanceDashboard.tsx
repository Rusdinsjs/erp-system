import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../../../api/attendance';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Table, TableHead, TableRow, TableBody, TableTd, TableTh } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { PageLoading } from '../../../components/ui/Loading';
import { CheckInModal } from './CheckInModal';
import { showToast } from '../../../components/ui/Toast';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuthStore } from '../../../store/useAuthStore';

export default function AttendanceDashboard() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [checkType, setCheckType] = useState<'check-in' | 'check-out'>('check-in');

    // Queries
    const { data: todayStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['attendance-today'],
        queryFn: attendanceApi.getTodayStatus,
    });

    const { data: myHistory, isLoading: historyLoading } = useQuery({
        queryKey: ['attendance-history'],
        queryFn: attendanceApi.getMyHistory,
    });

    const { data: allToday, isLoading: allLoading } = useQuery({
        queryKey: ['attendance-all-today'],
        queryFn: attendanceApi.getAllToday,
        enabled: user?.role === 'admin' || user?.role === 'manager', // Only fetch if admin/manager
    });

    // Mutations
    const checkInMutation = useMutation({
        mutationFn: attendanceApi.checkIn,
        onSuccess: () => {
            showToast('Successfully checked in', 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
            queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
            queryClient.invalidateQueries({ queryKey: ['attendance-all-today'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Check-in failed', 'error');
        }
    });

    const checkOutMutation = useMutation({
        mutationFn: attendanceApi.checkOut,
        onSuccess: () => {
            showToast('Successfully checked out', 'success');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
            queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
            queryClient.invalidateQueries({ queryKey: ['attendance-all-today'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Check-out failed', 'error');
        }
    });

    const handleCheckAction = (type: 'check-in' | 'check-out') => {
        setCheckType(type);
        setIsModalOpen(true);
    };

    const handleConfirmCheck = (data: { latitude: number; longitude: number; notes: string; photo_url: string }) => {
        if (checkType === 'check-in') {
            checkInMutation.mutate({ ...data, device_info: navigator.userAgent });
        } else {
            checkOutMutation.mutate({ ...data, device_info: navigator.userAgent });
        }
    };

    if (statusLoading || historyLoading) return <div className="p-8"><PageLoading /></div>;

    const hasCheckedIn = todayStatus?.data?.has_checked_in;
    const hasCheckedOut = todayStatus?.data?.has_checked_out;
    const currentSession = todayStatus?.data?.current_session;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {dayjs().format('dddd, D MMMM YYYY')}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card */}
                <Card className="col-span-1 p-6 relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Today's Status</h2>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant={hasCheckedOut ? 'success' : hasCheckedIn ? 'warning' : 'default'}>
                                    {hasCheckedOut ? 'Finished' : hasCheckedIn ? 'Working' : 'Not Started'}
                                </Badge>
                                {currentSession && (
                                    <span className="text-xs text-gray-500">
                                        Since {dayjs(currentSession.check_in_time).format('HH:mm')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-4">
                            <Clock className={`h-16 w-16 mb-4 ${hasCheckedIn && !hasCheckedOut ? 'text-orange-500 animate-pulse' : 'text-gray-400'
                                }`} />

                            {!hasCheckedIn && (
                                <Button
                                    className="w-full h-12 text-lg"
                                    onClick={() => handleCheckAction('check-in')}
                                    disabled={checkInMutation.isPending}
                                >
                                    Check In
                                </Button>
                            )}

                            {hasCheckedIn && !hasCheckedOut && (
                                <div className="w-full space-y-2">
                                    <div className="text-center text-sm text-gray-600 mb-2">
                                        Working for hours...
                                    </div>
                                    <Button
                                        className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleCheckAction('check-out')}
                                        disabled={checkOutMutation.isPending}
                                    >
                                        Check Out
                                    </Button>
                                </div>
                            )}

                            {hasCheckedOut && (
                                <div className="text-center text-green-600 font-medium flex flex-col items-center">
                                    <CheckCircle className="h-10 w-10 mb-2" />
                                    You have completed work for today.
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* History Card */}
                <Card className="col-span-1 md:col-span-2 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">My Recent History</h2>
                        <Button variant="ghost" size="sm">View All</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Date</TableTh>
                                    <TableTh>Check In</TableTh>
                                    <TableTh>Check Out</TableTh>
                                    <TableTh>Status</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {myHistory?.data?.slice(0, 5).map((record) => (
                                    <TableRow key={record.id}>
                                        <TableTd>{dayjs(record.check_in_time).format('DD MMM YYYY')}</TableTd>
                                        <TableTd className="font-mono text-xs">
                                            {dayjs(record.check_in_time).format('HH:mm')}
                                        </TableTd>
                                        <TableTd className="font-mono text-xs">
                                            {record.check_out_time ? dayjs(record.check_out_time).format('HH:mm') : '-'}
                                        </TableTd>
                                        <TableTd>
                                            <Badge variant={record.check_in_status === 'late' ? 'danger' : 'success'}>
                                                {record.check_in_status}
                                            </Badge>
                                        </TableTd>
                                    </TableRow>
                                )) || (
                                        <TableRow>
                                            <TableTd colSpan={4} className="text-center text-gray-500 py-4">
                                                No attendance history found
                                            </TableTd>
                                        </TableRow>
                                    )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* Admin View: Team Attendance */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
                <Card className="p-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">Team Status (Today)</h2>
                        <Badge variant="outline">{allToday?.data?.length || 0} Present</Badge>
                    </div>
                    {allLoading ? (
                        <PageLoading />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableTh>Employee</TableTh>
                                        <TableTh>Time In</TableTh>
                                        <TableTh>Time Out</TableTh>
                                        <TableTh>Status</TableTh>
                                        <TableTh className="text-right">Action</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allToday?.data?.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableTd className="font-medium">{record.employee_name || 'Unknown'}</TableTd>
                                            <TableTd className="font-mono text-xs">
                                                {dayjs(record.check_in_time).format('HH:mm')}
                                            </TableTd>
                                            <TableTd className="font-mono text-xs">
                                                {record.check_out_time ? dayjs(record.check_out_time).format('HH:mm') : '-'}
                                            </TableTd>
                                            <TableTd>
                                                <Badge variant={!record.check_out_time ? 'warning' : 'success'}>
                                                    {!record.check_out_time ? 'Working' : 'Finished'}
                                                </Badge>
                                            </TableTd>
                                            <TableTd className="text-right">
                                                <Button size="sm" variant="ghost">Details</Button>
                                            </TableTd>
                                        </TableRow>
                                    ))}
                                    {(!allToday?.data || allToday.data.length === 0) && (
                                        <TableRow>
                                            <TableTd colSpan={5} className="text-center text-gray-500 py-8">
                                                No one has checked in today yet.
                                            </TableTd>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            )}

            <CheckInModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmCheck}
                type={checkType}
                isLoading={checkInMutation.isPending || checkOutMutation.isPending}
            />
        </div>
    );
};
