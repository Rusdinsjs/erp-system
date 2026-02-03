import React, { useState, useEffect } from 'react';
import { approvalWorkflowApi } from '../api/approvalWorkflow';
import { rbacApi } from '../api/rbac';
import type { Role } from '../types';
import type { ApprovalWorkflow, ApprovalWorkflowRequest } from '../types/contract';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { Card } from '../components/ui';

const ApprovalWorkflowSettings: React.FC = () => {
    const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
    const [formData, setFormData] = useState<ApprovalWorkflowRequest>({
        workflow_name: '',
        entity_type: 'contract',
        approval_levels: 2,
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
            const [workflowData, roleData] = await Promise.all([
                approvalWorkflowApi.getAll(),
                rbacApi.listRoles(),
            ]);
            setWorkflows(workflowData);
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
            entity_type: 'contract',
            approval_levels: 2,
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
        try {
            if (editingWorkflow) {
                await approvalWorkflowApi.update(editingWorkflow.id, formData);
            } else {
                await approvalWorkflowApi.create(formData);
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to save workflow:', error);
            alert('Failed to save approval workflow');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Approval Workflows</h1>
                    <p className="text-muted-foreground mt-1">Configure multi-level approval steps for documents</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} /> Create Workflow
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow) => (
                    <Card key={workflow.id} padding="lg" className="hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground">{workflow.workflow_name}</h3>
                                <p className="text-sm text-primary font-medium uppercase tracking-wider mt-1">
                                    {workflow.entity_type}
                                </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${workflow.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                {workflow.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Levels:</span>
                                <span className="text-foreground font-medium">{workflow.approval_levels} Steps</span>
                            </div>
                            <div className="border-t border-border pt-3">
                                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Approval Chain</p>
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].slice(0, workflow.approval_levels).map(lvl => (
                                        <div key={lvl} className="flex items-center gap-2 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                                                {lvl}
                                            </div>
                                            <span className="text-muted-foreground">
                                                {(workflow as any)[`level_${lvl}_role`] || 'unassigned'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(workflow)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
                            >
                                <Edit2 size={16} /> Edit
                            </button>
                            <button
                                onClick={() => handleDelete(workflow.id)}
                                className="px-3 py-2 bg-destructive/10 text-destructive rounded hover:bg-destructive hover:text-destructive-foreground transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingWorkflow ? 'Edit Approval Workflow' : 'New Approval Workflow'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Workflow Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.workflow_name}
                                        onChange={(e) => setFormData({ ...formData, workflow_name: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="e.g. Contract Standard Approval"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Entity Type</label>
                                    <select
                                        value={formData.entity_type}
                                        onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground outline-none"
                                    >
                                        <option value="contract">Contract</option>
                                        <option value="rental">Rental</option>
                                        <option value="work_order">Work Order</option>
                                        <option value="purchase_order">Purchase Order</option>
                                        <option value="expense">Expense</option>
                                        <option value="leave_request">Leave Request</option>
                                        <option value="asset_disposal">Asset Disposal</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Approval Levels (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.approval_levels}
                                    onChange={(e) => setFormData({ ...formData, approval_levels: parseInt(e.target.value) })}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground outline-none"
                                />
                            </div>

                            <div className="space-y-4 border-t border-border pt-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase">Role Assignments</p>
                                {[1, 2, 3, 4, 5].slice(0, formData.approval_levels).map(lvl => (
                                    <div key={lvl} className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground w-16">Level {lvl}:</span>
                                        <select
                                            value={(formData as any)[`level_${lvl}_role`]}
                                            onChange={(e) => setFormData({ ...formData, [`level_${lvl}_role`]: e.target.value })}
                                            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm outline-none"
                                        >
                                            <option value="">Select Role</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.name}>{role.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded bg-background border-border text-primary focus:ring-0"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-foreground">Set as Active Workflow</label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20"
                                >
                                    <Save size={18} /> {editingWorkflow ? 'Update' : 'Create'} Workflow
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
