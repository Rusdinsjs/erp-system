import React, { useState, useEffect } from 'react';
import { approvalWorkflowApi } from '../api/approvalWorkflow';
import { approvalEntityTypesApi, type ApprovalEntityType } from '../api/approvalEntityTypes';
import { rbacApi } from '../api/rbac';
import type { Role } from '../types';
import type { ApprovalWorkflow, ApprovalWorkflowRequest } from '../types/contract';
import { Plus, Edit2, Trash2, X, Save, Search, Settings, Sparkles } from 'lucide-react';
import { Card } from '../components/ui';
import { APPROVAL_ENTITY_TYPES as FALLBACK_ENTITY_TYPES } from '../config/approvalEntities';
import * as LucideIcons from 'lucide-react';

const COLOR_OPTIONS = [
    { label: 'Green', value: 'text-green-400' },
    { label: 'Blue', value: 'text-blue-400' },
    { label: 'Cyan', value: 'text-cyan-400' },
    { label: 'Violet', value: 'text-violet-400' },
    { label: 'Orange', value: 'text-orange-400' },
    { label: 'Teal', value: 'text-teal-400' },
    { label: 'Purple', value: 'text-purple-400' },
    { label: 'Yellow', value: 'text-yellow-400' },
    { label: 'Rose', value: 'text-rose-400' },
    { label: 'Indigo', value: 'text-indigo-400' },
];

const COMMON_ICONS = [
    'Box', 'Wrench', 'ArrowLeftRight', 'RefreshCw', 'Truck',
    'ClipboardCheck', 'Fuel', 'FileText', 'ShoppingCart',
    'ShieldCheck', 'Tag', 'UserCheck', 'CheckSquare', 'Layers'
];

const PRESET_MODULES = [
    {
        key: 'custom',
        value: '',
        label: '-- Custom (Ketik Manual) --',
        icon: 'FileText',
        color: 'text-indigo-400',
        description: '',
        backend_module: '',
    },
    {
        key: 'purchase_order',
        value: 'purchase_order',
        label: 'Purchase Order',
        icon: 'ShoppingCart',
        color: 'text-indigo-400',
        description: 'Persetujuan pesanan pembelian barang / jasa',
        backend_module: 'purchase_service',
    },
    {
        key: 'purchase_request',
        value: 'purchase_request',
        label: 'Purchase Request',
        icon: 'ClipboardCheck',
        color: 'text-blue-400',
        description: 'Pengajuan kebutuhan pembelian barang / material',
        backend_module: 'purchase_service',
    },
    {
        key: 'expense_report',
        value: 'expense_report',
        label: 'Expense Report / Reimbursement',
        icon: 'Tag',
        color: 'text-rose-400',
        description: 'Persetujuan klaim biaya / pengeluaran operasional',
        backend_module: 'finance_service',
    },
    {
        key: 'contract',
        value: 'contract',
        label: 'Contract Agreement',
        icon: 'FileText',
        color: 'text-cyan-400',
        description: 'Persetujuan pembuatan & perpanjangan kontrak kerja sama',
        backend_module: 'contract_service',
    },
    {
        key: 'vendor_registration',
        value: 'vendor_registration',
        label: 'Vendor Registration',
        icon: 'UserCheck',
        color: 'text-teal-400',
        description: 'Persetujuan pendaftaran vendor / rekanan baru',
        backend_module: 'vendor_service',
    },
    {
        key: 'sales_order',
        value: 'sales_order',
        label: 'Sales Order',
        icon: 'CheckSquare',
        color: 'text-green-400',
        description: 'Persetujuan pesanan penjualan pelanggan',
        backend_module: 'sales_service',
    },
    {
        key: 'inventory_issue',
        value: 'inventory_issue',
        label: 'Inventory Issue / Material Release',
        icon: 'Layers',
        color: 'text-purple-400',
        description: 'Pengeluaran material / suku cadang dari gudang',
        backend_module: 'inventory_service',
    },
    {
        key: 'leave_request',
        value: 'leave_request',
        label: 'HRD Leave Request',
        icon: 'CheckSquare',
        color: 'text-amber-400',
        description: 'Pengajuan izin / cuti karyawan',
        backend_module: 'employee_service',
    },
    {
        key: 'overtime_request',
        value: 'overtime_request',
        label: 'HRD Overtime Request',
        icon: 'CheckSquare',
        color: 'text-yellow-400',
        description: 'Pengajuan jam lembur karyawan',
        backend_module: 'employee_service',
    },
];

const ApprovalWorkflowSettings: React.FC = () => {
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [entityTypes, setEntityTypes] = useState<ApprovalEntityType[]>(FALLBACK_ENTITY_TYPES as ApprovalEntityType[]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);

    // Entity Management Modals State
    const [showEntityManagerModal, setShowEntityManagerModal] = useState(false);
    const [showAddEditEntityModal, setShowAddEditEntityModal] = useState(false);
    const [editingEntity, setEditingEntity] = useState<ApprovalEntityType | null>(null);
    const [selectedPreset, setSelectedPreset] = useState('custom');
    const [entityFormData, setEntityFormData] = useState({
        value: '',
        label: '',
        icon: 'FileText',
        color: 'text-indigo-400',
        description: '',
        backend_module: '',
    });

    const [formData, setFormData] = useState<ApprovalWorkflowRequest>({
        workflow_name: '',
        entity_type: 'asset',
        approval_levels: 1,
        level_1_role: '',
        level_2_role: '',
        level_3_role: '',
        level_4_role: '',
        level_5_role: '',
        is_active: true,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [workflowData, entityTypeData, roleData] = await Promise.all([
                approvalWorkflowApi.getAll(),
                approvalEntityTypesApi.list().catch(() => FALLBACK_ENTITY_TYPES as ApprovalEntityType[]),
                rbacApi.listRoles(),
            ]);
            setWorkflows(workflowData);
            if (entityTypeData && entityTypeData.length > 0) {
                setEntityTypes(entityTypeData);
            }
            setRoles(roleData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingWorkflow(null);
        setFormData({
            workflow_name: '',
            entity_type: entityTypes[0]?.value || 'asset',
            approval_levels: 1,
            level_1_role: '',
            level_2_role: '',
            level_3_role: '',
            level_4_role: '',
            level_5_role: '',
            is_active: true,
        });
        setShowModal(true);
    };

    const handleEdit = (workflow: ApprovalWorkflow) => {
        setEditingWorkflow(workflow);
        setFormData({
            workflow_name: workflow.workflow_name,
            entity_type: workflow.entity_type,
            approval_levels: workflow.approval_levels,
            level_1_role: workflow.level_1_role || '',
            level_2_role: workflow.level_2_role || '',
            level_3_role: workflow.level_3_role || '',
            level_4_role: workflow.level_4_role || '',
            level_5_role: workflow.level_5_role || '',
            is_active: workflow.is_active,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validEntity = entityTypes.find(ent => ent.value === formData.entity_type);
        if (!validEntity) {
            alert('Invalid entity type selected.');
            return;
        }

        try {
            if (editingWorkflow) {
                await approvalWorkflowApi.update(editingWorkflow.id, formData);
            } else {
                await approvalWorkflowApi.create(formData);
            }
            setShowModal(false);
            loadData();
        } catch (error: any) {
            console.error('Failed to save workflow:', error);
            const msg = error?.response?.data?.error || error?.message || 'Failed to save approval workflow';
            alert(msg);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await approvalWorkflowApi.delete(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete workflow:', error);
        }
    };

    // Entity Management Functions
    const handleOpenAddEntity = () => {
        setEditingEntity(null);
        setSelectedPreset('custom');
        setEntityFormData({
            value: '',
            label: '',
            icon: 'FileText',
            color: 'text-indigo-400',
            description: '',
            backend_module: '',
        });
        setShowAddEditEntityModal(true);
    };

    const handleOpenEditEntity = (ent: ApprovalEntityType) => {
        setEditingEntity(ent);
        setSelectedPreset('custom');
        setEntityFormData({
            value: ent.value,
            label: ent.label,
            icon: ent.icon || 'FileText',
            color: ent.color || 'text-indigo-400',
            description: ent.description || '',
            backend_module: ent.backend_module || '',
        });
        setShowAddEditEntityModal(true);
    };

    const handleSaveEntity = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEntity) {
                await approvalEntityTypesApi.update(editingEntity.id, {
                    label: entityFormData.label,
                    icon: entityFormData.icon,
                    color: entityFormData.color,
                    description: entityFormData.description,
                    backend_module: entityFormData.backend_module,
                });
            } else {
                const cleanValue = entityFormData.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '');

                if (!cleanValue) {
                    alert('Value must contain only lowercase letters, digits, and underscores.');
                    return;
                }

                await approvalEntityTypesApi.create({
                    value: cleanValue,
                    label: entityFormData.label,
                    icon: entityFormData.icon,
                    color: entityFormData.color,
                    description: entityFormData.description,
                    backend_module: entityFormData.backend_module,
                });
            }
            setShowAddEditEntityModal(false);
            const updatedEntities = await approvalEntityTypesApi.list();
            setEntityTypes(updatedEntities);
        } catch (error: any) {
            console.error('Failed to save entity type:', error);
            const msg = error?.response?.data?.error || error?.message || 'Failed to save entity type';
            alert(msg);
        }
    };

    const handleDeleteEntity = async (ent: ApprovalEntityType) => {
        if (ent.is_system) {
            alert('System entity types cannot be deleted.');
            return;
        }
        if (!confirm(`Are you sure you want to delete entity type "${ent.label}"? Existing workflows using this entity type will still function.`)) {
            return;
        }
        try {
            await approvalEntityTypesApi.delete(ent.id);
            const updatedEntities = await approvalEntityTypesApi.list();
            setEntityTypes(updatedEntities);
        } catch (error: any) {
            console.error('Failed to delete entity type:', error);
            const msg = error?.response?.data?.error || error?.message || 'Failed to delete entity type';
            alert(msg);
        }
    };

    // Filter workflows
    const filteredWorkflows = workflows.filter(w => 
        w.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Approval Workflows</h1>
                    <p className="text-muted-foreground mt-1">Configure multi-level approval steps for documents & resources</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={() => setShowEntityManagerModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors whitespace-nowrap text-sm font-medium border border-border"
                    >
                        <Settings size={18} /> Manage Entity Types
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap text-sm font-medium shadow-md shadow-primary/20"
                    >
                        <Plus size={20} /> Create Workflow
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkflows.map((workflow) => {
                    const entityConfig = entityTypes.find(ent => ent.value === workflow.entity_type);
                    const IconComponent = entityConfig?.icon ? (LucideIcons as any)[entityConfig.icon] : null;

                    return (
                        <Card key={workflow.id} padding="lg" className="hover:border-primary/50 transition-all flex flex-col h-full shadow-sm hover:shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 pr-2">
                                    <h3 className="text-lg font-semibold text-foreground leading-tight">{workflow.workflow_name}</h3>
                                    
                                    {entityConfig ? (
                                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold uppercase tracking-wider ${entityConfig.color || 'text-primary'}`}>
                                            {IconComponent && <IconComponent size={14} />}
                                            {entityConfig.label}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mt-1">
                                            {workflow.entity_type} (deleted)
                                        </p>
                                    )}
                                </div>
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${workflow.is_active ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                    {workflow.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6 flex-grow">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Approval Steps:</span>
                                    <span className="text-foreground font-semibold">{workflow.approval_levels} Levels</span>
                                </div>
                                
                                <div className="border-t border-border pt-3">
                                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Approval Chain</p>
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].slice(0, workflow.approval_levels).map(lvl => {
                                            const rawRole = (workflow as any)[`level_${lvl}_role`];
                                            const roleObj = roles.find(r => r.code === rawRole || r.name === rawRole);
                                            const displayRole = roleObj ? roleObj.name : rawRole;
                                            
                                            return (
                                                <div key={lvl} className="flex items-center gap-2 text-sm">
                                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {lvl}
                                                    </div>
                                                    <span className="text-foreground font-medium truncate">
                                                        {displayRole || <span className="text-muted-foreground italic">Unassigned</span>}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-3 border-t border-border/50">
                                <button
                                    onClick={() => handleEdit(workflow)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                                >
                                    <Edit2 size={16} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(workflow.id)}
                                    className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all text-sm font-medium"
                                    title="Delete Workflow"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    );
                })}
                {filteredWorkflows.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
                        No workflows found matching "{searchTerm}"
                    </div>
                )}
            </div>

            {/* Workflow Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 shrink-0">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingWorkflow ? 'Edit Approval Workflow' : 'New Approval Workflow'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Workflow Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.workflow_name}
                                        onChange={(e) => setFormData({ ...formData, workflow_name: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                        placeholder="e.g. Standard Asset Approval"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Entity Type *</label>
                                    <select
                                        value={formData.entity_type}
                                        onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                                    >
                                        {entityTypes.map(ent => (
                                            <option key={ent.value} value={ent.value}>
                                                {ent.label} ({ent.value})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {entityTypes.find(e => e.value === formData.entity_type)?.description || 'Configured approval entity'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Approval Levels (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.approval_levels}
                                    onChange={(e) => setFormData({ ...formData, approval_levels: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary text-sm"
                                />
                            </div>

                            <div className="space-y-3 border-t border-border pt-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase">Role Chain Assignments</p>
                                {[1, 2, 3, 4, 5].slice(0, formData.approval_levels).map(lvl => (
                                    <div key={lvl} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        <span className="text-sm font-medium text-foreground w-20 shrink-0">Level {lvl}:</span>
                                        <select
                                            required
                                            value={(formData as any)[`level_${lvl}_role`]}
                                            onChange={(e) => setFormData({ ...formData, [`level_${lvl}_role`]: e.target.value })}
                                            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="" disabled>Select Role...</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.code}>{role.name} ({role.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 border-t border-border pt-4">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded bg-background border-border text-primary focus:ring-primary"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer select-none">
                                    Set as Active Workflow
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20 font-medium text-sm"
                                >
                                    <Save size={18} /> {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Entity Types Modal */}
            {showEntityManagerModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Manage Approval Entity Types</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Register custom menu entities for approval workflows</p>
                            </div>
                            <button onClick={() => setShowEntityManagerModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Registered Entities ({entityTypes.length})</span>
                                <button
                                    onClick={handleOpenAddEntity}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition"
                                >
                                    <Plus size={16} /> Add Entity Type
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {entityTypes.map((ent) => {
                                    const IconComp = ent.icon ? (LucideIcons as any)[ent.icon] : null;
                                    return (
                                        <div key={ent.value} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-lg hover:border-border/80 transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-background border border-border ${ent.color || 'text-primary'}`}>
                                                    {IconComp ? <IconComp size={18} /> : <Settings size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-foreground">{ent.label}</span>
                                                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{ent.value}</code>
                                                        {ent.is_system ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                                                                <Sparkles size={10} /> System
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                                                                Custom
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{ent.description || 'No description'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenEditEntity(ent)}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                                                    title="Edit Entity"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {!ent.is_system && (
                                                    <button
                                                        onClick={() => handleDeleteEntity(ent)}
                                                        className="p-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                        title="Delete Entity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0 flex justify-end">
                            <button
                                onClick={() => setShowEntityManagerModal(false)}
                                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Entity Type Sub-Modal */}
            {showAddEditEntityModal && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 shrink-0">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingEntity ? `Edit Entity Type: ${editingEntity.label}` : 'Add New Entity Type'}
                            </h3>
                            <button onClick={() => setShowAddEditEntityModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEntity} className="p-6 space-y-4 overflow-y-auto">
                            {!editingEntity && (
                                <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-lg space-y-1.5">
                                    <label className="block text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                                        <Sparkles size={14} /> Pilih dari Rekomendasi Modul (Quick Preset)
                                    </label>
                                    <select
                                        value={selectedPreset}
                                        onChange={(e) => {
                                            const key = e.target.value;
                                            setSelectedPreset(key);
                                            const selected = PRESET_MODULES.find(p => p.key === key);
                                            if (selected && selected.key !== 'custom') {
                                                setEntityFormData({
                                                    value: selected.value,
                                                    label: selected.label,
                                                    icon: selected.icon,
                                                    color: selected.color,
                                                    description: selected.description,
                                                    backend_module: selected.backend_module,
                                                });
                                            }
                                        }}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                    >
                                        {PRESET_MODULES.map(p => (
                                            <option key={p.key} value={p.key}>
                                                {p.label} {p.value ? `(${p.value})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Memilih preset akan otomatis mengisikan nilai field di bawah. Anda dapat menyesuaikannya kembali.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    Entity Value * {editingEntity && <span className="text-[10px] text-muted-foreground font-normal">(Cannot change value)</span>}
                                </label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editingEntity}
                                    value={entityFormData.value}
                                    onChange={(e) => setEntityFormData({ ...entityFormData, value: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm disabled:opacity-50 font-mono"
                                    placeholder="e.g. contract, purchase_order"
                                />
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Kode unik identifier (huruf kecil, angka, dan underscore).
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Label *</label>
                                <input
                                    type="text"
                                    required
                                    value={entityFormData.label}
                                    onChange={(e) => setEntityFormData({ ...entityFormData, label: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                    placeholder="e.g. Purchase Order"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    value={entityFormData.description}
                                    onChange={(e) => setEntityFormData({ ...entityFormData, description: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                    placeholder="e.g. Purchase order approval requests"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Icon (Lucide)</label>
                                    <select
                                        value={entityFormData.icon}
                                        onChange={(e) => setEntityFormData({ ...entityFormData, icon: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                    >
                                        {COMMON_ICONS.map(ic => (
                                            <option key={ic} value={ic}>{ic}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Color Theme</label>
                                    <select
                                        value={entityFormData.color}
                                        onChange={(e) => setEntityFormData({ ...entityFormData, color: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                    >
                                        {COLOR_OPTIONS.map(col => (
                                            <option key={col.value} value={col.value}>{col.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Backend Module (Optional)</label>
                                <input
                                    type="text"
                                    value={entityFormData.backend_module}
                                    onChange={(e) => setEntityFormData({ ...entityFormData, backend_module: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none text-sm"
                                    placeholder="e.g. purchase_service"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowAddEditEntityModal(false)}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium text-sm"
                                >
                                    <Save size={16} /> {editingEntity ? 'Update Entity' : 'Create Entity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalWorkflowSettings;
