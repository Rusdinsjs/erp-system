// TimesheetReviewer - Pure Tailwind
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Eye, Image as ImageIcon } from 'lucide-react';
import { timesheetApi, type TimesheetDetail } from '../../api/timesheet';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    Card, Badge, Button, ActionIcon, LoadingOverlay, Textarea, useToast
} from '../ui';

export function TimesheetReviewer() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [selectedTs, setSelectedTs] = useState<TimesheetDetail | null>(null);
    const [notes, setNotes] = useState('');

    const { data: pendingTs, isLoading } = useQuery({
        queryKey: ['timesheets', 'pending'],
        queryFn: () => timesheetApi.listPending()
    });

    const verifyMutation = useMutation({
        mutationFn: ({ id, status, notes }: { id: string, status: 'approved' | 'rejected', notes?: string }) =>
            timesheetApi.verify(id, { status, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            success('Timesheet verified', 'Success');
            setSelectedTs(null);
            setNotes('');
        },
        onError: (err: any) => {
            showError(err.message || 'Verification failed', 'Error');
        }
    });

    // Update notes when selection changes
    useEffect(() => {
        if (selectedTs) {
            setNotes(selectedTs.verifier_notes || '');
        }
    }, [selectedTs]);

    const handleVerify = (status: 'approved' | 'rejected') => {
        if (!selectedTs) return;
        verifyMutation.mutate({
            id: selectedTs.id,
            status,
            notes
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Timesheet Review Mode (Evidence-Based)</h4>
                <Badge variant="warning">
                    {pendingTs?.length || 0} Pending Items
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className={`transition-all duration-300 ${selectedTs ? 'md:col-span-5' : 'md:col-span-12'}`}>
                    <Card padding="none" className="h-full overflow-hidden relative">
                        <LoadingOverlay visible={isLoading} />
                        <div className="overflow-auto max-h-[600px]">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableTh>Date</TableTh>
                                        <TableTh>Asset / Rental</TableTh>
                                        <TableTh>Hours (Op/St)</TableTh>
                                        <TableTh>Evidence</TableTh>
                                        <TableTh>Action</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingTs?.map((ts) => (
                                        <TableRow
                                            key={ts.id}
                                            className={`cursor-pointer transition-colors ${selectedTs?.id === ts.id ? 'bg-blue-500/20 hover:bg-blue-500/30' : 'hover:bg-slate-800'}`}
                                            onClick={() => setSelectedTs(ts)}
                                        >
                                            <TableTd className="font-medium">{ts.work_date}</TableTd>
                                            <TableTd>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{ts.asset_name}</span>
                                                    <span className="text-xs text-slate-500">{ts.rental_number}</span>
                                                </div>
                                            </TableTd>
                                            <TableTd>{ts.operating_hours} / {ts.standby_hours}</TableTd>
                                            <TableTd>
                                                <div className="flex items-center gap-1">
                                                    <ImageIcon size={16} className={ts.photos?.length ? 'text-blue-400' : 'text-slate-600'} />
                                                    <span className="text-xs">{ts.photos?.length || 0}</span>
                                                </div>
                                            </TableTd>
                                            <TableTd>
                                                <ActionIcon onClick={() => setSelectedTs(ts)}>
                                                    <Eye size={16} />
                                                </ActionIcon>
                                            </TableTd>
                                        </TableRow>
                                    ))}
                                    {!pendingTs?.length && !isLoading && (
                                        <TableRow>
                                            <TableTd colSpan={5} className="text-center py-8 text-slate-500">
                                                All caught up! No pending timesheets.
                                            </TableTd>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {selectedTs && (
                    <div className="md:col-span-7 animate-in slide-in-from-right duration-300 fade-in">
                        <Card padding="md" className="h-full">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                                    <h5 className="font-semibold text-white">Detail Evidence: {selectedTs.work_date}</h5>
                                    <ActionIcon onClick={() => setSelectedTs(null)}>
                                        <X size={16} />
                                    </ActionIcon>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hour Meter / KM</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2 border border-slate-700 rounded bg-slate-800/50">
                                                <span className="text-xs text-slate-500 block">Start</span>
                                                <span className="font-medium text-white">{selectedTs.hm_km_start || '-'}</span>
                                            </div>
                                            <div className="p-2 border border-slate-700 rounded bg-slate-800/50">
                                                <span className="text-xs text-slate-500 block">End</span>
                                                <span className="font-medium text-white">{selectedTs.hm_km_end || '-'}</span>
                                            </div>
                                            <div className="p-2 border border-blue-900/50 rounded bg-blue-500/10">
                                                <span className="text-xs text-blue-300 block">Usage</span>
                                                <span className="font-bold text-blue-400">{selectedTs.hm_km_usage || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Location & Description</span>
                                        <div className="text-sm text-slate-300">
                                            <div><span className="text-slate-500">Loc:</span> {selectedTs.work_location || '-'}</div>
                                            <div className="mt-1">{selectedTs.work_description || 'No description'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Photo Evidence</span>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTs.photos && selectedTs.photos.length > 0 ? (
                                            selectedTs.photos.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`Evidence ${idx + 1}`}
                                                    className="w-32 h-32 object-cover rounded border border-slate-700 hover:border-blue-500 cursor-pointer transition-colors"
                                                    onClick={() => window.open(url, '_blank')}
                                                />
                                            ))
                                        ) : (
                                            <div className="w-full h-24 bg-slate-800/50 rounded border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-sm">
                                                No photo documentation uploaded
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 my-2"></div>

                                <Textarea
                                    label="Verification Notes"
                                    placeholder="Add notes for the field checker..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />

                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <Button
                                        variant="danger"
                                        leftIcon={<X size={16} />}
                                        onClick={() => handleVerify('rejected')}
                                        loading={verifyMutation.isPending}
                                    >
                                        Reject / Revision
                                    </Button>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        leftIcon={<Check size={16} />}
                                        onClick={() => handleVerify('approved')}
                                        loading={verifyMutation.isPending}
                                    >
                                        Verify & Approve
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
