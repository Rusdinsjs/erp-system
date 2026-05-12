import { useEffect, useState } from 'react';
import * as React from 'react';
import { Save, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { rbacApi } from '../../api/rbac';
import type { Role, Permission } from '../../types';
import { Button, Card, LoadingOverlay, useToast, Badge } from '../ui';

export function RolePermissionsMatrix() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                rbacApi.listRoles(),
                rbacApi.listPermissions(),
            ]);

            setRoles(rolesData);
            setPermissions(permsData);

            // Load permissions for each role
            const permMap: Record<string, Set<string>> = {};
            for (const role of rolesData) {
                const rolePerms = await rbacApi.getRolePermissions(role.id);
                permMap[role.id] = new Set(rolePerms.map(p => p.id));
            }
            setRolePermissions(permMap);
        } catch (err) {
            showError('Failed to load roles and permissions', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (roleId: string, permissionId: string) => {
        setRolePermissions(prev => {
            const newMap = { ...prev };
            const rolePerms = new Set(newMap[roleId] || []);

            if (rolePerms.has(permissionId)) {
                rolePerms.delete(permissionId);
            } else {
                rolePerms.add(permissionId);
            }

            newMap[roleId] = rolePerms;
            return newMap;
        });
        setHasChanges(true);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Save permissions for each role
            const promises = roles.map(role =>
                rbacApi.updateRolePermissions(
                    role.id,
                    Array.from(rolePermissions[role.id] || [])
                )
            );

            await Promise.all(promises);
            success('All role permissions updated successfully', 'Success');
            setHasChanges(false);
        } catch (err: any) {
            showError(err.response?.data?.message || 'Failed to update permissions', 'Error');
        } finally {
            setSaving(false);
        }
    };

    // Pool of ignored permissions (handled by workflows)
    const ignoredActions = ['approve', 'assign'];

    // Group permissions by resource, filtering out ignored actions
    const groupedPermissions = permissions
        .filter(perm => !ignoredActions.includes(perm.action.toLowerCase()))
        .reduce((acc, perm) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = [];
            }
            acc[perm.resource].push(perm);
            return acc;
        }, {} as Record<string, Permission[]>);

    // Show all roles in the matrix
    const editableRoles = roles;

    // Use a state to track expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    return (
        <div className="space-y-4">
            {hasChanges && (
                <div className="flex items-center justify-between bg-amber-950/30 border border-amber-700 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle size={20} />
                        <span className="font-medium">You have unsaved changes</span>
                    </div>
                    <Button
                        onClick={handleSaveAll}
                        loading={saving}
                        leftIcon={<Save size={16} />}
                    >
                        Save All Changes
                    </Button>
                </div>
            )}

            <Card padding="lg">
                <div className="relative">
                    <LoadingOverlay visible={loading} />

                    {!loading && (
                        <div className="overflow-x-auto max-h-[70vh]">
                            <table className="w-full border-collapse relative">
                                <thead className="sticky top-0 z-20 bg-slate-900 shadow-md">
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left p-3 text-slate-300 font-semibold sticky left-0 top-0 bg-slate-900 z-30 w-64 shadow-[1px_0_0_0_rgb(51,65,85)]">
                                            Permission Group
                                        </th>
                                        {editableRoles.map(role => (
                                            <th key={role.id} className="p-3 text-center min-w-[120px] bg-slate-900">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-semibold text-white">{role.name}</span>
                                                    <Badge variant={role.role_level === 1 ? 'danger' : role.role_level === 2 ? 'warning' : 'info'}>
                                                        L{role.role_level}
                                                    </Badge>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedPermissions).map(([resource, perms]) => {
                                        const isExpanded = expandedGroups[resource];
                                        return (
                                            <React.Fragment key={resource}>
                                                <tr
                                                    className="bg-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors"
                                                    onClick={() => toggleGroup(resource)}
                                                >
                                                    <td colSpan={editableRoles.length + 1} className="p-3">
                                                        <div className="flex items-center gap-2 font-bold text-cyan-400 uppercase text-sm">
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            {resource.replace(/_/g, ' ')}
                                                            <span className="ml-auto text-xs text-slate-500 font-normal normal-case">
                                                                {perms.length} permissions
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && perms.map(perm => (
                                                    <tr key={perm.id} className="border-b border-slate-800 hover:bg-slate-800/30 animate-in slide-in-from-top-2 duration-200">
                                                        <td className="p-3 pl-8 sticky left-0 bg-slate-900 border-r border-slate-800">
                                                            <div>
                                                                <div className="text-white font-medium">{perm.action}</div>
                                                                <div className="text-xs text-slate-500">{perm.description || perm.code}</div>
                                                            </div>
                                                        </td>
                                                        {editableRoles.map(role => {
                                                            const hasPermission = rolePermissions[role.id]?.has(perm.id) || false;

                                                            return (
                                                                <td key={role.id} className="p-3 text-center border-r border-slate-800/50">
                                                                    <div className="flex justify-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={hasPermission}
                                                                            onChange={() => togglePermission(role.id, perm.id)}
                                                                            className="w-5 h-5 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500 cursor-pointer transition-all hover:scale-110"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>

            {hasChanges && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleSaveAll}
                        loading={saving}
                        leftIcon={<Save size={16} />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        Save All Changes
                    </Button>
                </div>
            )}
        </div>
    );
}
