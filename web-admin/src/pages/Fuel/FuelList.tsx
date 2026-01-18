import React, { useState, useEffect } from 'react';
import {
    Check, X, FileText, Printer, Upload
} from 'lucide-react';
import { Table, TableHead, TableRow, TableTh, TableBody, TableTd } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fuelApi, type FuelLog } from '../../api/fuel';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../../components/ui';
import { FuelApprovalModal } from './FuelApprovalModal';
import { FuelCompletionModal } from './FuelCompletionModal';

interface FuelListProps {
    scope: 'my_requests' | 'pending_approvals' | 'history';
    refreshTrigger: number;
    onActionComplete: () => void;
}

export const FuelList: React.FC<FuelListProps> = ({ scope, refreshTrigger, onActionComplete }) => {
    const { user } = useAuthStore();
    const { success, error: showError } = useToast();
    const [logs, setLogs] = useState<FuelLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [selectedLog, setSelectedLog] = useState<FuelLog | null>(null);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);
    const [isCompletionOpen, setIsCompletionOpen] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            if (scope === 'pending_approvals') {
                const data = await fuelApi.listPending();
                setLogs(data);
            } else {
                // history or my_requests
                // TODO: Support filtering. For now fetching all history.
                const data = await fuelApi.listHistory(1, 100);
                let filtered = data.data;
                if (scope === 'my_requests' && user?.id) {
                    filtered = filtered.filter(l => l.requested_by === user.id);
                }
                setLogs(filtered);
            }
        } catch (error) {
            console.error('Failed to fetch fuel logs:', error);
            showError('Failed to load data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [scope, refreshTrigger, user]);

    const handleApprove = (log: FuelLog) => {
        setSelectedLog(log);
        setIsApprovalOpen(true);
    };

    const handleComplete = (log: FuelLog) => {
        setSelectedLog(log);
        setIsCompletionOpen(true);
    };

    const handleReject = async (log: FuelLog) => {
        if (!confirm('Are you sure you want to reject this request?')) return;
        try {
            await fuelApi.reject(log.id, "Rejected by admin"); // Prompt for reason ideally
            success('Request rejected', 'Success');
            onActionComplete();
        } catch (error) {
            showError('Failed to reject', 'Error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'requested': return 'warning';
            case 'approved': return 'success'; // or blue
            case 'completed': return 'success';
            case 'rejected': return 'danger';
            default: return 'default';
        }
    };

    return (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Tracking #</TableTh>
                            <TableTh>Date</TableTh>
                            <TableTh>Asset</TableTh>
                            <TableTh>Requester</TableTh>
                            <TableTh>Request</TableTh>
                            <TableTh>Odometer</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableTd colSpan={8} className="text-center py-8 text-slate-400">
                                    Loading...
                                </TableTd>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableTd colSpan={8} className="text-center py-8 text-slate-400">
                                    No records found
                                </TableTd>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableTd className="font-mono text-xs">{log.tracking_number}</TableTd>
                                    <TableTd className="text-sm">
                                        {new Date(log.created_at).toLocaleDateString()}
                                    </TableTd>
                                    <TableTd>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{log.asset_name || 'Unknown Asset'}</span>
                                        </div>
                                    </TableTd>
                                    <TableTd className="text-sm text-slate-400">{log.requester_name}</TableTd>
                                    <TableTd>
                                        <div className="font-medium">
                                            {Number(log.requested_value).toLocaleString('id-ID')}
                                            <span className="text-xs text-slate-500 ml-1">
                                                {log.request_type === 'volume' ? 'L' : 'IDR'}
                                            </span>
                                        </div>
                                    </TableTd>
                                    <TableTd className="text-sm">{Number(log.odometer_reading).toLocaleString()} KM</TableTd>
                                    <TableTd>
                                        <Badge variant={getStatusColor(log.status)}>
                                            {log.status.toUpperCase()}
                                        </Badge>
                                        {log.coupon_code && (
                                            <div className="mt-1 text-xs font-mono bg-slate-800 px-1 py-0.5 rounded text-center text-slate-300">
                                                {log.coupon_code}
                                            </div>
                                        )}
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Actions based on status and scope */}
                                            {log.status === 'requested' && scope === 'pending_approvals' && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => handleReject(log)} className="text-red-400 hover:text-red-300">
                                                        <X size={16} />
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleApprove(log)} className="bg-green-600 hover:bg-green-700 text-white">
                                                        <Check size={16} className="mr-1" /> Approve
                                                    </Button>
                                                </>
                                            )}

                                            {log.status === 'approved' && (
                                                <>
                                                    <Button size="sm" variant="outline" title="Print Coupon">
                                                        <Printer size={14} />
                                                    </Button>
                                                    {(scope === 'my_requests' || scope === 'history') && (
                                                        <Button size="sm" onClick={() => handleComplete(log)} className="bg-blue-600 hover:bg-blue-700">
                                                            <Upload size={14} className="mr-1" /> Complete
                                                        </Button>
                                                    )}
                                                </>
                                            )}

                                            {log.status === 'completed' && (
                                                <Button size="sm" variant="ghost" title="View Receipt">
                                                    <FileText size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedLog && (
                <>
                    <FuelApprovalModal
                        isOpen={isApprovalOpen}
                        onClose={() => setIsApprovalOpen(false)}
                        onSuccess={() => {
                            setIsApprovalOpen(false);
                            onActionComplete();
                        }}
                        log={selectedLog}
                    />
                    <FuelCompletionModal
                        isOpen={isCompletionOpen}
                        onClose={() => setIsCompletionOpen(false)}
                        onSuccess={() => {
                            setIsCompletionOpen(false);
                            onActionComplete();
                        }}
                        log={selectedLog}
                    />
                </>
            )}
        </>
    );
};
