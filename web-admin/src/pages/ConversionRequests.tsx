// ConversionRequests Page - Pure Tailwind
import { useState, useEffect } from 'react';
import { Check, X, Play } from 'lucide-react';
import { conversionApi, type AssetConversion } from '../api/conversion';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    Badge,
    Modal,
    Textarea,
    LoadingOverlay,
    useToast,
} from '../components/ui';

export const ConversionRequests = () => {
    const [requests, setRequests] = useState<AssetConversion[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [actionFunc, setActionFunc] = useState<() => Promise<void>>(() => Promise.resolve());

    const { success, error: showError } = useToast();

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await conversionApi.getPendingRequests();
            setRequests(data);
        } catch (error) {
            showError('Failed to fetch pending requests', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request: AssetConversion, action: 'approve' | 'reject' | 'execute') => {
        setNotes('');

        if (action === 'approve') {
            setModalTitle('Approve Conversion Request');
            setActionFunc(() => async () => {
                await conversionApi.approveRequest(request.id);
            });
        } else if (action === 'reject') {
            setModalTitle('Reject Conversion Request');
            setActionFunc(() => async () => {
                await conversionApi.rejectRequest(request.id);
            });
        } else if (action === 'execute') {
            setModalTitle('Execute Conversion');
            setActionFunc(() => async () => {
                await conversionApi.executeConversion(request.id, { notes });
            });
        }

        setModalOpen(true);
    };

    const confirmAction = async () => {
        setActionLoading(true);
        try {
            await actionFunc();
            success('Action completed successfully', 'Success');
            fetchRequests();
            setModalOpen(false);
        } catch (error: any) {
            showError(error.response?.data?.message || 'Action failed', 'Error');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status: string): 'warning' | 'success' | 'danger' | 'info' | 'default' => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'info';
            case 'completed': return 'success';
            case 'rejected': return 'danger';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Conversion Requests</h1>

            <Card padding="lg">
                <div className="relative min-h-[200px]">
                    <LoadingOverlay visible={loading} />

                    {requests.length === 0 && !loading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <p>No pending conversion requests.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Date</TableTh>
                                    <TableTh>Request #</TableTh>
                                    <TableTh>Asset ID</TableTh>
                                    <TableTh>Title</TableTh>
                                    <TableTh>Requested By</TableTh>
                                    <TableTh>Cost</TableTh>
                                    <TableTh>Status</TableTh>
                                    <TableTh align="center">Actions</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {requests.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableTd>{new Date(item.created_at || '').toLocaleDateString()}</TableTd>
                                        <TableTd>
                                            <span className="font-mono text-sm">{item.request_number}</span>
                                        </TableTd>
                                        <TableTd>
                                            <span className="font-mono text-xs text-slate-400">
                                                {item.asset_id.substring(0, 8)}...
                                            </span>
                                        </TableTd>
                                        <TableTd>
                                            <span className="font-medium text-white">{item.title}</span>
                                        </TableTd>
                                        <TableTd>{item.requested_by}</TableTd>
                                        <TableTd>
                                            {item.conversion_cost > 0
                                                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.conversion_cost)
                                                : '-'}
                                        </TableTd>
                                        <TableTd>
                                            <Badge variant={getStatusBadge(item.status)}>
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </TableTd>
                                        <TableTd align="center">
                                            <div className="flex items-center justify-center gap-1">
                                                {item.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            leftIcon={<Check size={14} />}
                                                            onClick={() => handleAction(item, 'approve')}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            leftIcon={<X size={14} />}
                                                            onClick={() => handleAction(item, 'reject')}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {item.status === 'approved' && (
                                                    <Button
                                                        size="sm"
                                                        leftIcon={<Play size={14} />}
                                                        onClick={() => handleAction(item, 'execute')}
                                                    >
                                                        Execute
                                                    </Button>
                                                )}
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Action Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
            >
                <div className="space-y-4">
                    {modalTitle.includes('Execute') && (
                        <Textarea
                            label="Execution Notes"
                            placeholder="Details about the execution..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    )}
                    {modalTitle.includes('Reject') && (
                        <Textarea
                            label="Rejection Reason (Internal Note)"
                            placeholder="Why is it rejected?"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    )}
                    {modalTitle.includes('Approve') && (
                        <p className="text-sm text-slate-300">Are you sure you want to approve this request?</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button loading={actionLoading} onClick={confirmAction}>Confirm</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
