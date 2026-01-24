// TimesheetReviewer - Pure Tailwind
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Eye, Image as ImageIcon, CheckSquare, Clock } from 'lucide-react';
import { timesheetApi, type TimesheetDetail } from '../../api/timesheet';
import {
    Badge, Button, ActionIcon, LoadingOverlay, Textarea, useToast
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
        <div className="flex flex-col h-full bg-gray-900/10">
            {/* Sub-Header / Filter Area */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gray-950/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <CheckSquare size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Timesheet Verification</h4>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Evidence-Based Review Mode</p>
                    </div>
                </div>
                <Badge variant="warning" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-orange-500/10">
                    {pendingTs?.length || 0} Pending Items
                </Badge>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-gray-950/20">
                {/* List Pane */}
                <div className={`transition-all duration-500 h-full border-r border-white/5 flex flex-col ${selectedTs ? 'md:col-span-5' : 'md:col-span-12'}`}>
                    <div className="flex-1 overflow-auto relative custom-scrollbar">
                        <LoadingOverlay visible={isLoading} />
                        <table className="w-full text-left text-sm text-gray-300 border-separate border-spacing-0">
                            <thead className="bg-gray-950/80 sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Work Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Asset / Contract</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Usage (H)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 text-center">Docs</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 text-center flex justify-center">
                                        <Clock size={14} className="opacity-50" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pendingTs?.map((ts) => (
                                    <tr
                                        key={ts.id}
                                        className={`group cursor-pointer transition-all duration-300 ${selectedTs?.id === ts.id ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'hover:bg-white/[0.03]'}`}
                                        onClick={() => setSelectedTs(ts)}
                                    >
                                        <td className="px-6 py-4 font-bold text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
                                            {ts.work_date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-gray-200 font-medium group-hover:translate-x-1 transition-transform">{ts.asset_name}</span>
                                                <span className="text-[10px] font-mono text-gray-500 uppercase">{ts.rental_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-blue-400">
                                            {ts.operating_hours}h <span className="text-gray-600 text-[10px] ml-1">/{ts.standby_hours}s</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                                <ImageIcon size={12} className={ts.photos?.length ? 'text-blue-400' : 'text-gray-600'} />
                                                <span className="text-[10px] font-bold">{ts.photos?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <ActionIcon
                                                    onClick={(e) => { e.stopPropagation(); setSelectedTs(ts); }}
                                                    variant="default"
                                                    className="rounded-xl hover:bg-white/10"
                                                >
                                                    <Eye size={16} className="text-gray-400 group-hover:text-white" />
                                                </ActionIcon>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!pendingTs?.length && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="p-6 bg-white/5 rounded-full mb-4">
                                    <CheckSquare size={48} className="text-emerald-500/20" />
                                </div>
                                <h5 className="text-white font-bold text-lg mb-1">Queue Empty</h5>
                                <p className="text-gray-500 text-sm">All pending timesheets have been verified.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Pane */}
                <div className={`transition-all duration-500 h-full overflow-hidden bg-gray-900/60 backdrop-blur-md relative flex flex-col ${selectedTs ? 'md:col-span-7 translate-x-0 opacity-100' : 'md:col-span-0 translate-x-full opacity-0 overflow-hidden hidden'}`}>
                    {selectedTs && (
                        <>
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

                            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 z-20 bg-gray-950/40 backdrop-blur-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <ImageIcon size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-black text-white uppercase tracking-tight">Evidence Deep Review</h5>
                                        <p className="text-xs text-gray-400 font-medium">Logged on {selectedTs.work_date} • {selectedTs.asset_name}</p>
                                    </div>
                                </div>
                                <ActionIcon onClick={() => setSelectedTs(null)} className="rounded-xl w-10 h-10 hover:bg-white/10 border border-white/5">
                                    <X size={20} />
                                </ActionIcon>
                            </div>

                            <div className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar relative z-10">
                                {/* Meters Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">HM/KM Start</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-blue-500/20 rounded-full" />
                                            <span className="text-2xl font-mono font-black text-white tracking-tighter">{selectedTs.hm_km_start || '0'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">HM/KM End</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-purple-500/20 rounded-full" />
                                            <span className="text-2xl font-mono font-black text-white tracking-tighter">{selectedTs.hm_km_end || '0'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 group animate-in zoom-in duration-500">
                                        <span className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest block mb-2">Total Usage</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                            <span className="text-2xl font-mono font-black text-blue-400 tracking-tighter">{selectedTs.hm_km_usage || '0'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Work Description */}
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock size={16} className="text-gray-500" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Work Details & Location</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 mb-1">Site Location</span>
                                            <p className="text-sm font-bold text-gray-200">{selectedTs.work_location || 'No location specified'}</p>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 mb-1">Activity Log</span>
                                            <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-white/5 pl-4 py-1 bg-white/[0.02] rounded-r-lg">
                                                {selectedTs.work_description || 'No description recorded'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Media Gallery */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon size={16} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Visual Evidence</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{selectedTs.photos?.length || 0} Assets</span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {selectedTs.photos && selectedTs.photos.length > 0 ? (
                                            selectedTs.photos.map((url, idx) => (
                                                <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-black/40 hover:border-blue-500/50 transition-all cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                                    <img
                                                        src={url}
                                                        alt={`Evidence ${idx + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors pointer-events-none" />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600 gap-2">
                                                <ImageIcon size={32} className="opacity-20" />
                                                <p className="text-xs font-bold uppercase tracking-widest opacity-50">No photo documentation</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Verification Section */}
                                <div className="pt-8 border-t border-white/5 space-y-6">
                                    <Textarea
                                        label="Verification Findings & Notes"
                                        placeholder="Add internal verification notes or reason for rejection..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="bg-black/60 border-white/5 rounded-2xl min-h-[120px] focus:border-blue-500/50 transition-colors"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="ghost"
                                            leftIcon={<X size={20} />}
                                            onClick={() => handleVerify('rejected')}
                                            loading={verifyMutation.isPending}
                                            className="rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                                        >
                                            Decline / Revision
                                        </Button>
                                        <Button
                                            variant="primary"
                                            leftIcon={<Check size={20} />}
                                            onClick={() => handleVerify('approved')}
                                            loading={verifyMutation.isPending}
                                            className="rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                                        >
                                            Verify & Approve
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
