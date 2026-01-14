// AuditMode Page - Pure Tailwind
import { useState } from 'react';
import { Check, AlertCircle, QrCode } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditApi } from '../api/audit';
import { assetApi } from '../api/assets';
import {
    Button,
    Card,
    Input,
    Spinner,
    useToast,
} from '../components/ui';

export function AuditMode() {
    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();
    const [assetInput, setAssetInput] = useState('');

    // Fetch assets for simulation
    const { data: assets } = useQuery({
        queryKey: ['assets'],
        queryFn: () => assetApi.list({ page: 1, per_page: 50 }),
        enabled: true
    });

    const simulateScan = () => {
        if (!assets?.data || assets.data.length === 0) {
            info('No assets found to simulate scan.', 'No Assets');
            return;
        }
        const randomAsset = assets.data[Math.floor(Math.random() * assets.data.length)];
        setAssetInput(randomAsset.id);
        info(`Scanned: ${randomAsset.name ?? randomAsset.asset_code}`, 'Simulated Scan');
    };

    // Fetch active session
    const { data: activeSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['audit-session'],
        queryFn: auditApi.getActiveSession,
        refetchInterval: 5000
    });

    // Fetch progress if active session exists
    const { data: progress } = useQuery({
        queryKey: ['audit-progress', activeSession?.id],
        queryFn: () => auditApi.getProgress(activeSession!.id),
        enabled: !!activeSession,
        refetchInterval: 2000
    });

    // Mutations
    const startMutation = useMutation({
        mutationFn: auditApi.startSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-session'] });
            success('New audit session initialized.', 'Audit Started');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to start audit', 'Error');
        }
    });

    const closeMutation = useMutation({
        mutationFn: auditApi.closeSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['audit-session'] });
            info('Audit session finalized.', 'Audit Closed');
        }
    });

    const submitMutation = useMutation({
        mutationFn: (vars: { assetId: string, status: string, notes?: string }) =>
            auditApi.submitRecord(activeSession!.id, vars.assetId, vars.status, vars.notes),
        onSuccess: () => {
            setAssetInput('');
            queryClient.invalidateQueries({ queryKey: ['audit-progress'] });
            success('Asset audit record saved.', 'Recorded');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to submit record', 'Error');
        }
    });

    const handleStart = () => {
        startMutation.mutate(undefined);
    };

    const handleClose = () => {
        if (!activeSession) return;
        if (confirm('Are you sure you want to close this audit session?')) {
            closeMutation.mutate(activeSession.id);
        }
    };

    const handleSubmit = async () => {
        if (!assetInput) return;
        submitMutation.mutate({ assetId: assetInput, status: 'found' });
    };

    if (isLoadingSession) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    // No active session - show start button
    if (!activeSession) {
        return (
            <div className="max-w-md mx-auto py-12">
                <Card padding="lg" className="text-center">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">Asset Audit</h2>
                        <p className="text-slate-400">No active audit session found.</p>
                        <Button
                            size="lg"
                            onClick={handleStart}
                            loading={startMutation.isPending}
                        >
                            Start New Session
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const progressValue = progress ? Math.round((progress.audited / progress.total) * 100) : 0;
    const remaining = (progress?.total || 0) - (progress?.audited || 0);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Audit in Progress</h1>
                    <p className="text-sm text-slate-400">
                        Started: {new Date(activeSession.created_at).toLocaleString()}
                    </p>
                </div>
                <Button
                    variant="danger"
                    onClick={handleClose}
                    loading={closeMutation.isPending}
                >
                    Close Session
                </Button>
            </div>

            {/* Progress Card */}
            <Card padding="lg">
                <div className="flex items-center justify-center gap-8">
                    {/* Ring Progress */}
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Background circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-slate-800"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${progressValue * 2.64} 264`}
                                className="text-cyan-500 transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{progressValue}%</span>
                            <span className="text-xs text-slate-400">Completed</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                        <p className="text-sm text-slate-300">
                            Total Assets: <span className="font-bold text-white">{progress?.total || 0}</span>
                        </p>
                        <p className="text-sm text-slate-300">
                            Audited: <span className="font-bold text-cyan-400">{progress?.audited || 0}</span>
                        </p>
                        <p className="text-sm text-slate-300">
                            Remaining: <span className="font-bold text-amber-400">{remaining}</span>
                        </p>
                    </div>
                </div>
            </Card>

            {/* Scan Input Card */}
            <Card padding="lg">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Scan / Input Asset ID</h3>

                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <Input
                                label="Asset ID / UUID"
                                placeholder="Enter asset UUID..."
                                value={assetInput}
                                onChange={(e) => setAssetInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                            />
                        </div>
                        <Button variant="outline" onClick={simulateScan} leftIcon={<QrCode size={16} />}>
                            Simulate QR
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            loading={submitMutation.isPending}
                            leftIcon={<Check size={18} />}
                        >
                            Submit Found
                        </Button>
                    </div>

                    {/* Info Alert */}
                    <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                        <AlertCircle size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-cyan-400">Note</p>
                            <p className="text-sm text-slate-300">
                                Enter the Asset UUID to mark it as found. In a real mobile app, this would use the camera scanner.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
