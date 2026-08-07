import { useState, useEffect } from 'react';
import { GitMerge, Plus, Trash2, Save, FileText, ArrowRight } from 'lucide-react';
import { workflowApi, type WorkflowWithDocType, type WorkflowState, type WorkflowTransitionDetail } from '../../api/workflow';
import { rbacApi } from '../../api/rbac';
import type { Role } from '../../types';
import { Button, Card, Select, Input, Badge, useToast, LoadingOverlay, Modal } from '../../components/ui';

interface DocType {
    id: string;
    name: string;
    module: string;
    description?: string;
    is_submittable: boolean;
}

export function WorkflowBuilder() {
    const [workflows, setWorkflows] = useState<WorkflowWithDocType[]>([]);
    const [docTypes, setDocTypes] = useState<DocType[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
    const [workflowDetail, setWorkflowDetail] = useState<{
        workflow: WorkflowWithDocType;
        states: WorkflowState[];
        transitions: WorkflowTransitionDetail[];
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form states
    const [newWfName, setNewWfName] = useState('');
    const [newWfDocType, setNewWfDocType] = useState('');
    const [newWfStatusField, setNewWfStatusField] = useState('workflow_state');

    // New State form
    const [newStateName, setNewStateName] = useState('');
    const [newStateDocStatus, setNewStateDocStatus] = useState<number>(0);
    const [newStateVariant, setNewStateVariant] = useState('info');
    const [newStateEditRole, setNewStateEditRole] = useState('');

    // New Transition form
    const [newTransStateId, setNewTransStateId] = useState('');
    const [newTransAction, setNewTransAction] = useState('');
    const [newTransNextStateId, setNewTransNextStateId] = useState('');
    const [newTransRole, setNewTransRole] = useState('');

    const { success, error: showError } = useToast();

    useEffect(() => {
        initData();
    }, []);

    useEffect(() => {
        if (selectedWorkflowId) {
            loadWorkflowDetail(selectedWorkflowId);
        } else {
            setWorkflowDetail(null);
        }
    }, [selectedWorkflowId]);

    const initData = async () => {
        setLoading(true);
        try {
            const [wfList, dtList, roleList] = await Promise.all([
                workflowApi.listWorkflows(),
                rbacApi.listDocTypes(),
                rbacApi.listRoles()
            ]);
            setWorkflows(wfList);
            setDocTypes(dtList);
            setRoles(roleList);

            if (wfList.length > 0) {
                setSelectedWorkflowId(wfList[0].id);
            }
        } catch (err: any) {
            showError('Gagal memuat data Workflow', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const loadWorkflowDetail = async (id: string) => {
        setLoading(true);
        try {
            const data = await workflowApi.getWorkflowDetail(id);
            setWorkflowDetail(data);
        } catch (err: any) {
            showError('Gagal memuat detail Workflow', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorkflow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWfName || !newWfDocType) {
            showError('Nama Workflow dan DocType wajib diisi', 'Perhatian');
            return;
        }

        setSaving(true);
        try {
            const newWf = await workflowApi.createWorkflow({
                workflow_name: newWfName,
                doctype_id: newWfDocType,
                document_status_field: newWfStatusField,
            });
            success('Workflow baru berhasil dibuat', 'Sukses');
            setIsCreateModalOpen(false);
            setNewWfName('');
            
            // Reload list
            const wfList = await workflowApi.listWorkflows();
            setWorkflows(wfList);
            setSelectedWorkflowId(newWf.id);
        } catch (err: any) {
            showError(err.response?.data?.message || 'Gagal membuat workflow', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddState = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkflowId || !newStateName) return;

        setSaving(true);
        try {
            await workflowApi.saveWorkflowState(selectedWorkflowId, {
                state_name: newStateName,
                doc_status: newStateDocStatus,
                allow_edit_role_id: newStateEditRole || undefined,
                style_variant: newStateVariant,
            });
            success('Status tahapan berhasil ditambahkan', 'Sukses');
            setNewStateName('');
            loadWorkflowDetail(selectedWorkflowId);
        } catch (err: any) {
            showError('Gagal menambahkan status', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddTransition = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkflowId || !newTransStateId || !newTransAction || !newTransNextStateId || !newTransRole) {
            showError('Lengkapi seluruh bidang formulir transisi', 'Perhatian');
            return;
        }

        setSaving(true);
        try {
            await workflowApi.saveWorkflowTransition(selectedWorkflowId, {
                state_id: newTransStateId,
                action_name: newTransAction,
                next_state_id: newTransNextStateId,
                allowed_role_id: newTransRole,
            });
            success('Aturan transisi berhasil ditambahkan', 'Sukses');
            setNewTransAction('');
            loadWorkflowDetail(selectedWorkflowId);
        } catch (err: any) {
            showError('Gagal menambahkan transisi', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWorkflow = async () => {
        if (!selectedWorkflowId) return;
        if (!confirm('Apakah Anda yakin ingin menghapus alur kerja ini?')) return;

        setSaving(true);
        try {
            await workflowApi.deleteWorkflow(selectedWorkflowId);
            success('Workflow berhasil dihapus', 'Sukses');
            const wfList = await workflowApi.listWorkflows();
            setWorkflows(wfList);
            setSelectedWorkflowId(wfList.length > 0 ? wfList[0].id : '');
        } catch (err: any) {
            showError('Gagal menghapus workflow', 'Error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="p-6 bg-card border-border shadow-xl space-y-6 relative overflow-hidden">
            <LoadingOverlay visible={loading || saving} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                        <GitMerge size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            ERPQu Workflow Builder Engine
                            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                                ERPQu Standard
                            </Badge>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Perancang alur kerja dinamis, status tahapan (States), dan aturan persetujuan (Transitions)
                        </p>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    leftIcon={<Plus size={16} />}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    Buat Workflow Baru
                </Button>
            </div>

            {/* Toolbar Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Pilih Workflow Aktif
                    </label>
                    <Select
                        value={selectedWorkflowId}
                        onChange={(val: string) => setSelectedWorkflowId(val)}
                        options={workflows.map((w: WorkflowWithDocType) => ({
                            value: w.id,
                            label: `${w.workflow_name} [${w.doctype_name}]`
                        }))}
                        className="w-full bg-background"
                    />
                </div>

                {workflowDetail && (
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-xs text-muted-foreground block">DocType Target:</span>
                            <span className="font-mono text-cyan-400 font-bold text-sm">
                                {workflowDetail.workflow.doctype_name} ({workflowDetail.workflow.document_status_field})
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                            leftIcon={<Trash2 size={14} />}
                            onClick={handleDeleteWorkflow}
                        >
                            Hapus Workflow
                        </Button>
                    </div>
                )}
            </div>

            {/* Workflow Config Sections */}
            {workflowDetail ? (
                <div className="space-y-8">
                    {/* SECTION 1: STATES */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <FileText size={18} className="text-cyan-400" />
                                1. Tahapan Status (Workflow States)
                            </h3>
                        </div>

                        {/* Add State Form */}
                        <form onSubmit={handleAddState} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                            <Input
                                placeholder="Nama Status (misal: Pending Supervisor)"
                                value={newStateName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStateName(e.target.value)}
                                required
                            />

                            <Select
                                value={String(newStateDocStatus)}
                                onChange={(val: string) => setNewStateDocStatus(parseInt(val))}
                                options={[
                                    { value: '0', label: 'Draft (DocStatus 0)' },
                                    { value: '1', label: 'Submitted (DocStatus 1)' },
                                    { value: '2', label: 'Cancelled (DocStatus 2)' }
                                ]}
                            />

                            <Select
                                value={newStateVariant}
                                onChange={(val: string) => setNewStateVariant(val)}
                                options={[
                                    { value: 'secondary', label: 'Badge Secondary (Gray)' },
                                    { value: 'warning', label: 'Badge Warning (Yellow)' },
                                    { value: 'success', label: 'Badge Success (Green)' },
                                    { value: 'danger', label: 'Badge Danger (Red)' },
                                    { value: 'info', label: 'Badge Info (Cyan)' }
                                ]}
                            />

                            <Select
                                value={newStateEditRole}
                                onChange={(val: string) => setNewStateEditRole(val)}
                                options={[
                                    { value: '', label: '-- Siapa Boleh Edit? (Opsional) --' },
                                    ...roles.map((r: Role) => ({ value: r.id, label: r.name }))
                                ]}
                            />

                            <Button type="submit" variant="primary" leftIcon={<Plus size={14} />}>
                                Tambah State
                            </Button>
                        </form>

                        {/* States Table */}
                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                                    <tr>
                                        <th className="p-3">Nama Status (State Name)</th>
                                        <th className="p-3 text-center">DocStatus</th>
                                        <th className="p-3 text-center">Badge Color</th>
                                        <th className="p-3">Allowed Edit Role (Guard)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {workflowDetail.states.map((st: WorkflowState) => (
                                        <tr key={st.id} className="hover:bg-muted/20">
                                            <td className="p-3 font-semibold text-foreground">{st.state_name}</td>
                                            <td className="p-3 text-center font-mono">
                                                <Badge variant={st.doc_status === 1 ? 'success' : st.doc_status === 2 ? 'danger' : 'default'}>
                                                    {st.doc_status === 0 ? '0 (Draft)' : st.doc_status === 1 ? '1 (Submitted)' : '2 (Cancelled)'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant={st.style_variant as any}>{st.style_variant}</Badge>
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                                {roles.find((r: Role) => r.id === st.allow_edit_role_id)?.name || 'Semua Pemegang Izin DocPerm'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SECTION 2: TRANSITIONS */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <ArrowRight size={18} className="text-cyan-400" />
                                2. Aturan Transisi & Aksi Persetujuan (Workflow Transitions)
                            </h3>
                        </div>

                        {/* Add Transition Form */}
                        <form onSubmit={handleAddTransition} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                            <Select
                                value={newTransStateId}
                                onChange={(val: string) => setNewTransStateId(val)}
                                options={[
                                    { value: '', label: '-- Status Awal (From State) --' },
                                    ...workflowDetail.states.map((s: WorkflowState) => ({ value: s.id!, label: s.state_name }))
                                ]}
                            />

                            <Input
                                placeholder="Nama Aksi (misal: Approve WorkOrder)"
                                value={newTransAction}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTransAction(e.target.value)}
                                required
                            />

                            <Select
                                value={newTransNextStateId}
                                onChange={(val: string) => setNewTransNextStateId(val)}
                                options={[
                                    { value: '', label: '-- Status Tujuan (To State) --' },
                                    ...workflowDetail.states.map((s: WorkflowState) => ({ value: s.id!, label: s.state_name }))
                                ]}
                            />

                            <Select
                                value={newTransRole}
                                onChange={(val: string) => setNewTransRole(val)}
                                options={[
                                    { value: '', label: '-- Role Yang Berhak (Allowed Role) --' },
                                    ...roles.map((r: Role) => ({ value: r.id, label: r.name }))
                                ]}
                            />

                            <Button type="submit" variant="primary" leftIcon={<Plus size={14} />}>
                                Tambah Transisi
                            </Button>
                        </form>

                        {/* Transitions Table */}
                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                                    <tr>
                                        <th className="p-3">Status Awal (From State)</th>
                                        <th className="p-3 text-cyan-400">Nama Aksi (Action Button)</th>
                                        <th className="p-3">Status Tujuan (Next State)</th>
                                        <th className="p-3">Role Yang Berhak Memicu Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {workflowDetail.transitions.map((tr: WorkflowTransitionDetail) => (
                                        <tr key={tr.id} className="hover:bg-muted/20">
                                            <td className="p-3 font-semibold text-foreground">{tr.state_name}</td>
                                            <td className="p-3 font-mono font-bold text-cyan-400">{tr.action_name}</td>
                                            <td className="p-3 font-semibold text-foreground">{tr.next_state_name}</td>
                                            <td className="p-3 font-semibold text-amber-400">
                                                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
                                                    {tr.allowed_role_name}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center text-muted-foreground">
                    Belum ada Workflow yang dipilih atau dibuat. Klik tombol "Buat Workflow Baru" untuk memulai.
                </div>
            )}

            {/* Create Workflow Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Buat Alur Kerja (Workflow) Baru"
            >
                <form onSubmit={handleCreateWorkflow} className="space-y-4">
                    <Input
                        label="Nama Workflow"
                        placeholder="contoh: WorkOrder Approval Workflow"
                        value={newWfName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWfName(e.target.value)}
                        required
                    />

                    <Select
                        label="DocType Target"
                        value={newWfDocType}
                        onChange={(val: string) => setNewWfDocType(val)}
                        options={[
                            { value: '', label: '-- Pilih DocType --' },
                            ...docTypes.map((dt: DocType) => ({ value: dt.id, label: `[${dt.module}] ${dt.name}` }))
                        ]}
                    />

                    <Input
                        label="Kolom Status Dokumen"
                        placeholder="workflow_state"
                        value={newWfStatusField}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWfStatusField(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="primary" leftIcon={<Save size={16} />}>
                            Simpan Workflow
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
