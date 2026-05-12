
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Settings, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { Card, Modal, Input, Button, useToast, Skeleton } from '../components/ui';
import { RolePermissionsMatrix } from '../components/Admin/RolePermissionsMatrix';
import { rbacApi } from '../api/rbac';
import type { Role } from '../types';

type TabType = 'overview' | 'permissions';

function RolesList() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        role_level: 5
    });

    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: rbacApi.listRoles
    });

    const createMutation = useMutation({
        mutationFn: rbacApi.createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsModalOpen(false);
            success('Role created successfully');
            resetForm();
        },
        onError: (err: any) => showError(err.message || 'Failed to create role')
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => rbacApi.updateRole(editingRole!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsModalOpen(false);
            success('Role updated successfully');
            resetForm();
        },
        onError: (err: any) => showError(err.message || 'Failed to update role')
    });

    const deleteMutation = useMutation({
        mutationFn: rbacApi.deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            success('Role deleted successfully');
        },
        onError: (err: any) => showError(err.message || 'Failed to delete role')
    });

    const resetForm = () => {
        setEditingRole(null);
        setFormData({ code: '', name: '', description: '', role_level: 5 });
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            code: role.code,
            name: role.name,
            description: role.description || '',
            role_level: role.role_level
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRole) {
            updateMutation.mutate({
                name: formData.name,
                description: formData.description,
                role_level: formData.role_level
            });
        } else {
            createMutation.mutate(formData);
        }
    };

    if (isLoading) return (
        <Card padding="lg">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        </Card>
    );

    return (
        <Card padding="lg">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Roles Overview</h3>
                    <p className="text-sm text-slate-400">Manage system roles and access levels</p>
                </div>
                <Button
                    leftIcon={<Plus size={18} />}
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                >
                    Add Role
                </Button>
            </div>

            <div className="grid gap-4">
                {roles.map((role: Role) => (
                    <div key={role.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-white text-lg">{role.name}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300 font-mono">
                                        Level {role.role_level}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-400 font-mono">
                                        {role.code}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1">{role.description || 'No description provided'}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(role)}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                >
                                    <Edit2 size={16} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        if (confirm(`Delete role ${role.name}? This cannot be undone.`)) {
                                            deleteMutation.mutate(role.id);
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {roles.length === 0 && (
                    <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                        No roles found. Create one to get started.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRole ? 'Edit Role' : 'Create New Role'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Role Name"
                            placeholder="e.g. Field Coordinator"
                            value={formData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            label="Role Code"
                            placeholder="e.g. FIELD_COORD"
                            value={formData.code}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                            disabled={!!editingRole}
                            required
                        />
                    </div>

                    <div>
                        <Input
                            label="Role Level (1-5)"
                            type="number"
                            min={1}
                            max={5}
                            value={formData.role_level}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, role_level: parseInt(e.target.value) })}
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Level 1: Super Admin (Full Access) <br />
                            Level 5: Basic User (Limited Access)
                        </p>
                    </div>

                    <Input
                        label="Description"
                        placeholder="Brief description of this role's responsibilities"
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            <Save size={18} className="mr-2" />
                            {editingRole ? 'Update Role' : 'Create Role'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}


export default function Roles() {
    const [activeTab, setActiveTab] = useState<TabType>('permissions');

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Role Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage roles and their permissions
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Card padding="none">
                <div className="border-b border-slate-700">
                    <nav className="flex gap-4 px-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Shield size={16} />
                                <span>Roles Overview</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'permissions'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Settings size={16} />
                                <span>Permission Matrix</span>
                            </div>
                        </button>
                    </nav>
                </div>
            </Card>

            {/* Tab Content */}
            {activeTab === 'overview' && <RolesList />}

            {activeTab === 'permissions' && <RolePermissionsMatrix />}
        </div>
    );
}
