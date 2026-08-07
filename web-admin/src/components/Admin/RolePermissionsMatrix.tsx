import { useEffect, useState } from 'react';
import * as React from 'react';
import { Save, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { rbacApi } from '../../api/rbac';
import type { Role, Permission } from '../../types';
import { Button, Card, LoadingOverlay, useToast, Badge } from '../ui';
import { DEFAULT_LAUNCHPAD_CONFIG, MENU_LABELS, MENU_TO_RESOURCE } from '../../config/launchpadConfig';

const ACTIONS = ['view', 'create', 'edit', 'delete', 'submit', 'cancel', 'print', 'export', 'report'];


export function RolePermissionsMatrix() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [, setPermissions] = useState<Permission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({}); // roleId -> Set<permissionId>
    const [permissionMap, setPermissionMap] = useState<Record<string, Permission>>({}); // `${resource}.${action}` -> Permission
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

            const pMap: Record<string, Permission> = {};
            permsData.forEach(p => {
                pMap[`${p.resource}.${p.action}`] = p;
            });
            setPermissionMap(pMap);

            const permMap: Record<string, Set<string>> = {};
            for (const role of rolesData) {
                const rolePerms = await rbacApi.getRolePermissions(role.id);
                permMap[role.id] = new Set(rolePerms.map(p => p.id));
            }
            setRolePermissions(permMap);
            
            // Expand all modules by default
            const initialExpanded: Record<string, boolean> = {};
            DEFAULT_LAUNCHPAD_CONFIG.modules.forEach(m => {
                initialExpanded[m.id] = true;
            });
            setExpandedGroups(initialExpanded);
        } catch (err) {
            showError('Failed to load roles and permissions', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (roleId: string, permissionId: string) => {
        if (!permissionId) return; // In case the permission doesn't exist in DB
        
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

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const editableRoles = roles.sort((a, b) => a.role_level - b.role_level);

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
                        <div className="overflow-x-auto max-h-[75vh] rounded-xl border border-border">
                            <table className="w-full border-collapse relative text-sm">
                                <thead className="sticky top-0 z-30 bg-card shadow-sm">
                                    <tr className="border-b border-border">
                                        <th className="text-left p-4 text-muted-foreground font-semibold sticky left-0 top-0 bg-card z-40 min-w-[250px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            Menu Structure
                                        </th>
                                        {editableRoles.map(role => (
                                            <th key={role.id} className="p-3 text-center min-w-[280px] bg-card border-b border-r border-border">
                                                <div className="flex flex-col items-center gap-1.5 mb-2">
                                                    <span className="font-semibold text-foreground">{role.name}</span>
                                                    <Badge variant={role.role_level === 1 ? 'danger' : role.role_level === 2 ? 'warning' : 'info'}>
                                                        Level {role.role_level}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-9 gap-0.5 text-[9px] uppercase text-muted-foreground font-bold tracking-wider pt-2 border-t border-border/50">
                                                    <span>View</span>
                                                    <span>Create</span>
                                                    <span>Edit</span>
                                                    <span>Del</span>
                                                    <span>Subm</span>
                                                    <span>Canc</span>
                                                    <span>Prnt</span>
                                                    <span>Exprt</span>
                                                    <span>Rprt</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DEFAULT_LAUNCHPAD_CONFIG.modules.map(module => {
                                        const isExpanded = expandedGroups[module.id];
                                        return (
                                            <React.Fragment key={module.id}>
                                                {/* Accordion Header */}
                                                <tr
                                                    className="bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors border-b border-border/60"
                                                    onClick={() => toggleGroup(module.id)}
                                                >
                                                    <td className="p-3 sticky left-0 bg-muted/95 backdrop-blur z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                        <div className="flex items-center gap-2 font-bold text-primary">
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            {module.title}
                                                        </div>
                                                    </td>
                                                    <td colSpan={editableRoles.length} className="bg-muted/40"></td>
                                                </tr>
                                                
                                                {/* Menu Rows */}
                                                {isExpanded && module.menuIds.map(menuId => {
                                                    const resource = MENU_TO_RESOURCE[menuId] || menuId.replace(/-/g, '_');
                                                    return (
                                                        <tr key={menuId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                                            <td className="p-3 pl-10 sticky left-0 bg-card z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                                <span className="text-foreground font-medium">{MENU_LABELS[menuId] || menuId}</span>
                                                                <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{resource}</span>
                                                            </td>
                                                            {editableRoles.map(role => (
                                                                <td key={role.id} className="p-2 border-r border-border/40">
                                                                    <div className="grid grid-cols-9 gap-0.5 justify-items-center">
                                                                        {ACTIONS.map(action => {
                                                                            const normAction = action === 'view' ? 'read' : action === 'edit' ? 'update' : action;
                                                                            const perm = permissionMap[`${resource}.${action}`]
                                                                                || permissionMap[`${resource}.${normAction}`]
                                                                                || permissionMap[`${menuId}.${action}`]
                                                                                || permissionMap[`${menuId}.${normAction}`];
                                                                            const hasPermission = perm && rolePermissions[role.id]?.has(perm.id);
                                                                            
                                                                            // Auto-checked for Super Admin
                                                                            const isSuperAdmin = role.role_level === 1;
                                                                            const isChecked = isSuperAdmin ? true : hasPermission;
                                                                            
                                                                            return (
                                                                                <div key={action} className="flex justify-center items-center h-8 w-8">
                                                                                    {perm ? (
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isChecked}
                                                                                            disabled={isSuperAdmin}
                                                                                            onChange={() => togglePermission(role.id, perm.id)}
                                                                                            className={`w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary cursor-pointer transition-all ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                                                                            title={`${action.toUpperCase()} ${MENU_LABELS[menuId]}`}
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-muted-foreground/30 text-xs" title="Not Applicable">-</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
