import { useState, useEffect } from 'react';
import { GitMerge, Check, X, Send } from 'lucide-react';

import { workflowApi, type WorkflowDetailResponse, type WorkflowTransitionDetail } from '../../api/workflow';
import { Button, Badge, Modal, Textarea, useToast } from '../ui';

interface WorkflowActionBarProps {
    workflowId: string;
    documentId: string;
    currentState: string;
    onStateChanged: (newState: string) => void;
}

export function WorkflowActionBar({
    workflowId,
    documentId,
    currentState,
    onStateChanged,
}: WorkflowActionBarProps) {
    const [detail, setDetail] = useState<WorkflowDetailResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Modal state for comment/rejection reason
    const [selectedTransition, setSelectedTransition] = useState<WorkflowTransitionDetail | null>(null);
    const [comments, setComments] = useState('');
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

    const { success, error: showError } = useToast();

    useEffect(() => {
        if (workflowId) {
            loadWorkflow();
        }
    }, [workflowId]);

    const loadWorkflow = async () => {
        setLoading(true);
        try {
            const data = await workflowApi.getWorkflowDetail(workflowId);
            setDetail(data);
        } catch (err: any) {
            console.error('Failed to load workflow action bar', err);
        } finally {
            setLoading(false);
        }
    };

    const validTransitions = detail?.transitions.filter(
        t => t.state_name.toLowerCase() === currentState.toLowerCase()
    ) || [];

    const currentStateObj = detail?.states.find(
        s => s.state_name.toLowerCase() === currentState.toLowerCase()
    );

    const handleActionClick = (transition: WorkflowTransitionDetail) => {
        setSelectedTransition(transition);
        setComments('');
        setIsCommentModalOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedTransition) return;

        setSubmitting(true);
        try {
            const res = await workflowApi.applyWorkflowAction({
                workflow_id: workflowId,
                document_id: documentId,
                current_state_name: currentState,
                action_name: selectedTransition.action_name,
                comments: comments || undefined,
            });

            success(`Status dokumen berhasil diperbarui menjadi: ${res.new_state}`, 'Sukses');
            setIsCommentModalOpen(false);
            onStateChanged(res.new_state);
        } catch (err: any) {
            showError(err.response?.data?.message || 'Gagal mengeksekusi transisi alur kerja', 'Otorisasi Ditolak');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !detail) return null;

    return (
        <div className="bg-card/80 backdrop-blur-md border border-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            {/* Status Info */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                    <GitMerge size={20} />
                </div>
                <div>
                    <span className="text-xs text-muted-foreground block font-medium">Status Workflow Saat Ini:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-foreground text-base">{currentState}</span>
                        <Badge variant={(currentStateObj?.style_variant as any) || 'info'} className="text-xs">
                            DocStatus: {currentStateObj?.doc_status ?? 0}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
                {validTransitions.length === 0 ? (
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
                        Tidak ada tindakan alur kerja yang tersedia di status ini.
                    </span>
                ) : (
                    validTransitions.map(tr => {
                        const isReject = tr.action_name.toLowerCase().includes('reject');
                        const isApprove = tr.action_name.toLowerCase().includes('approve');
                        
                        let variant: 'primary' | 'outline' | 'ghost' = 'primary';
                        let icon = <Send size={16} />;
                        if (isApprove) {
                            icon = <Check size={16} />;
                        } else if (isReject) {
                            variant = 'outline';
                            icon = <X size={16} />;
                        }

                        return (
                            <Button
                                key={tr.id}
                                variant={variant}
                                className={isReject ? 'text-rose-400 border-rose-500/30 hover:bg-rose-500/10' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'}
                                leftIcon={icon}
                                onClick={() => handleActionClick(tr)}
                            >
                                {tr.action_name}
                            </Button>
                        );
                    })
                )}
            </div>

            {/* Comment & Confirm Modal */}
            <Modal
                isOpen={isCommentModalOpen}
                onClose={() => setIsCommentModalOpen(false)}
                title={`Konfirmasi Aksi: ${selectedTransition?.action_name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Dokumen akan dipindahkan dari status <span className="font-bold text-foreground">{currentState}</span> menjadi <span className="font-bold text-cyan-400">{selectedTransition?.next_state_name}</span>.
                    </p>

                    <Textarea
                        label="Catatan / Alasan (Opsional)"
                        placeholder="Tambahkan alasan persetujuan atau instruksi revisi..."
                        value={comments}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                        rows={3}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsCommentModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            loading={submitting}
                            leftIcon={<Check size={16} />}
                            onClick={handleConfirmAction}
                        >
                            Eksekusi Transisi
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
