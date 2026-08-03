// Users Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Edit, Trash2, Link, UserCheck, Eye } from 'lucide-react';
import { usersApi, type UserSummary, type UpdateUserRequest } from '../api/users';
import { departmentApi, type Department } from '../api/departments';
import { getImageUrl } from '../utils/image';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    Select,
    LoadingOverlay,
    useToast,
} from '../components/ui';

interface Role {
    id: string;
    code: string;
    name: string;
    role_level: number;
}


export default function Users() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserSummary[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);

    const [editOpened, setEditOpened] = useState(false);
    const [viewOpened, setViewOpened] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
    const [editFormData, setEditFormData] = useState<UpdateUserRequest>({});

    // Filters
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterLinked, setFilterLinked] = useState<string>('all');

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                usersApi.list(1, 100),
                usersApi.listRoles(),
                departmentApi.list()
            ]);

            if (usersRes && Array.isArray(usersRes.data)) {
                setUsers(usersRes.data);
                setFilteredUsers(usersRes.data);
            } else if (Array.isArray(usersRes)) {
                setUsers(usersRes);
                setFilteredUsers(usersRes);
            }

            if (Array.isArray(rolesRes)) {
                setRoles(rolesRes);
            }

            if (Array.isArray(deptsRes)) {
                setDepartmentsList(deptsRes);
            }
        } catch (error) {
            console.error(error);
            showError('Failed to load data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    // Apply filters whenever users or filter values change
    useEffect(() => {
        let filtered = [...users];

        if (filterRole !== 'all') {
            filtered = filtered.filter(u => {
                if (u.role_code === filterRole) return true;
                const rolesArr = getUserRolesArray(u);
                return rolesArr.some(r => r.code === filterRole);
            });
        }

        if (filterDepartment !== 'all') {
            filtered = filtered.filter(u => u.department === filterDepartment);
        }

        if (filterStatus === 'active') {
            filtered = filtered.filter(u => u.is_active);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(u => !u.is_active);
        }

        if (filterLinked === 'linked') {
            filtered = filtered.filter(u => u.employee_name || u.employee_id);
        } else if (filterLinked === 'unlinked') {
            filtered = filtered.filter(u => !u.employee_name && !u.employee_id);
        }

        setFilteredUsers(filtered);
    }, [users, filterRole, filterDepartment, filterStatus, filterLinked]);


    const handleUpdate = async () => {
        if (!editingUser) return;
        setSubmitting(true);
        try {
            // Build payload – only include fields that have actual values
            // Empty strings are sent as null/undefined so backend COALESCE keeps existing value
            const payload: UpdateUserRequest = {
                name: editFormData.name,
                role_code: selectedRoleCodes[0] || editFormData.role_code,
                role_codes: selectedRoleCodes,
                is_active: editFormData.is_active,
                password: editFormData.password || undefined,
                department: editFormData.department ?? undefined,
                allowed_asset_group: editFormData.allowed_asset_group ?? undefined,
                employee_id: editFormData.employee_id || undefined,
                clear_employee_link: editFormData.clear_employee_link,
            };
            console.log('[handleUpdate] payload:', payload);
            const res = await usersApi.update(editingUser.id, payload);
            console.log('[handleUpdate] response:', res);
            success('User updated successfully', 'Success');
            setEditOpened(false);
            loadData();
        } catch (e: any) {
            console.error('[handleUpdate] error:', e.response?.data || e.message);
            showError(e.response?.data?.message || e.message || 'Failed to update user', 'Error');
        } finally {
            setSubmitting(false);
        }
    };


    const handleDelete = async (user: UserSummary) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
        try {
            await usersApi.delete(user.id);
            success('User deleted', 'Success');
            loadData();
        } catch (e: any) {
            showError('Failed to delete user', 'Error');
        }
    };

    const openViewModal = (user: UserSummary) => {
        setSelectedUser(user);
        setViewOpened(true);
    };

    const getUserRolesArray = (user: UserSummary): Array<{ id?: string; code: string; name: string; role_level: number }> => {
        if (!user.roles) return [];
        if (Array.isArray(user.roles)) return user.roles;
        if (typeof user.roles === 'string') {
            try {
                const parsed = JSON.parse(user.roles);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Failed to parse user.roles:', e);
            }
        }
        return [];
    };

    const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([]);

    const openEditModal = (user: UserSummary) => {
        setEditingUser(user);
        const rolesArr = getUserRolesArray(user);
        const existingRoles = rolesArr.length > 0
            ? rolesArr.map(r => r.code)
            : [user.role_code];
        setSelectedRoleCodes(existingRoles);
        setEditFormData({
            name: user.name,
            role_code: user.role_code,
            role_codes: existingRoles,
            is_active: user.is_active,
            department: user.department || '',
            allowed_asset_group: user.allowed_asset_group || '',
            employee_id: user.employee_id || '',
            clear_employee_link: false,
        });
        setEditOpened(true);
    };

    const getRoleBadge = (level: number) => {
        if (level === 1) return 'danger';
        if (level === 2) return 'warning';
        if (level === 3) return 'warning';
        if (level === 4) return 'info';
        return 'default';
    };

    const getAccessScope = (roleCode: string) => {
        switch (roleCode) {
            case 'super_admin': return 'Full System Access';
            case 'admin': return 'Organization Management';
            case 'manager': return 'Approval L2, Asset Management';
            case 'supervisor': return 'Approval L1, Operational View';
            case 'admin_alat_berat': return 'Spesialis Alat Berat';
            case 'admin_kendaraan': return 'Spesialis Kendaraan';
            case 'admin_infrastruktur': return 'Spesialis Infrastruktur';
            case 'technician': return 'Maintenance Execution';
            case 'staff': return 'General Staff View';
            case 'user': return 'Basic View Access';
            default: return 'Limited Access';
        }
    };

    const getRoleLabel = (user?: UserSummary | null) => {
        if (!user) return 'User (L5)';
        const roleCode = user.role_code || (user as any).role || '';
        const foundRole = roles.find(r => r.code === roleCode);
        if (foundRole) {
            return `${foundRole.name} (L${foundRole.role_level})`;
        }
        if (!roleCode) return `User (L${user.role_level || 5})`;
        const formattedCode = roleCode
            .split('_')
            .map((word: string) => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
            .join(' ');
        return `${formattedCode} (L${user.role_level || 5})`;
    };

    const roleOptions = roles.map(r => ({ value: r.code, label: `${r.name} (L${r.role_level})` }));

    // Get unique departments for filter
    const departments = Array.from(new Set([
        ...departmentsList.map(d => d.name),
        ...users.map(u => u.department).filter(Boolean)
    ]));
    const departmentOptions = [
        { value: 'all', label: 'All Departments' },
        ...departments.map(d => ({ value: d!, label: d! }))
    ];

    const formDepartmentOptions = [
        { value: '', label: 'None (All Departments)' },
        ...departments.map(d => ({ value: d!, label: d! }))
    ];

    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    const linkStatusOptions = [
        { value: 'all', label: 'All Link Status' },
        { value: 'linked', label: 'Linked Employee Only' },
        { value: 'unlinked', label: 'Not Linked Only' }
    ];

    const assetGroupOptions = [
        { value: '', label: 'None (Full Access)' },
        { value: 'ALAT_BERAT', label: 'Alat Berat' },
        { value: 'KENDARAAN', label: 'Kendaraan' },
        { value: 'INFRASTRUKTUR', label: 'Infrastruktur' },
    ];



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Operations</h1>
                    <p className="text-xs text-slate-400 mt-1">Manage system user accounts and their linked employee profiles.</p>
                </div>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex gap-3 flex-wrap items-end">
                    <div className="min-w-[180px]">
                        <Select
                            label="Filter by Role"
                            value={filterRole}
                            onChange={setFilterRole}
                            options={[{ value: 'all', label: 'All Roles' }, ...roleOptions]}
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <Select
                            label="Filter by Department"
                            value={filterDepartment}
                            onChange={setFilterDepartment}
                            options={departmentOptions}
                        />
                    </div>
                    <div className="min-w-[150px]">
                        <Select
                            label="Filter by Account Status"
                            value={filterStatus}
                            onChange={setFilterStatus}
                            options={statusOptions}
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <Select
                            label="Filter by Employee Link"
                            value={filterLinked}
                            onChange={setFilterLinked}
                            options={linkStatusOptions}
                        />
                    </div>
                    <div className="flex items-center pb-2">
                        <span className="text-sm text-slate-400 font-medium">
                            Showing {filteredUsers.length} of {users.length} users
                        </span>
                    </div>
                </div>
            </Card>

            <Card padding="lg">
                <div className="relative">
                    <LoadingOverlay visible={loading} />
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Name</TableTh>
                                <TableTh>Email</TableTh>
                                <TableTh>Role</TableTh>
                                <TableTh>Access Scope</TableTh>
                                <TableTh>Login Status</TableTh>
                                <TableTh>Linked Employee</TableTh>
                                <TableTh align="center">Action</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableTd>
                                        <span className="font-medium text-white">{user.name}</span>
                                    </TableTd>
                                    <TableTd>{user.email}</TableTd>
                                    <TableTd>
                                         {(() => {
                                             const rolesArr = getUserRolesArray(user);
                                             return rolesArr.length > 0 ? (
                                                 <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                     {rolesArr.map((r, idx) => (
                                                         <Badge key={r.code || idx} variant={getRoleBadge(r.role_level)}>
                                                             {r.name} (L{r.role_level})
                                                         </Badge>
                                                     ))}
                                                 </div>
                                             ) : (
                                                 <Badge variant={getRoleBadge(user.role_level)}>
                                                     {getRoleLabel(user)}
                                                 </Badge>
                                             );
                                         })()}
                                    </TableTd>
                                    <TableTd>
                                        <span className="text-sm text-slate-400">
                                            {getAccessScope(user.role_code)}
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {user.department && (
                                                <Badge variant="info">Dept: {user.department}</Badge>
                                            )}
                                            {user.allowed_asset_group && (
                                                <Badge variant="warning">Asset: {user.allowed_asset_group}</Badge>
                                            )}
                                        </div>
                                    </TableTd>
                                     <TableTd>
                                         <Badge variant={user.is_active ? 'success' : 'danger'}>
                                             {user.is_active ? 'Allowed' : 'Denied'}
                                         </Badge>
                                         <p className="text-xs text-slate-400 mt-1">
                                             {user.last_login_at ? new Date(user.last_login_at).toLocaleString('id-ID') : 'Belum pernah login'}
                                         </p>
                                     </TableTd>
                                    <TableTd>
                                        {user.employee_name ? (
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                                                    <UserCheck size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{user.employee_name}</p>
                                                    {user.employee_nik && (
                                                        <p className="text-xs text-slate-400 font-mono">NIK: {user.employee_nik}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 italic">Not Linked</span>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium flex items-center gap-1 ml-1"
                                                    title="Link an Employee to this User"
                                                >
                                                    <Link size={12} /> Link
                                                </button>
                                            </div>
                                        )}
                                    </TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ActionIcon onClick={() => openViewModal(user)} title="View User Details">
                                                <Eye size={16} />
                                            </ActionIcon>
                                            <ActionIcon onClick={() => openEditModal(user)} title="Edit User">
                                                <Edit size={16} />
                                            </ActionIcon>
                                            {user.role_level > 1 && (
                                                <ActionIcon variant="danger" onClick={() => handleDelete(user)} title="Delete User">
                                                    <Trash2 size={16} />
                                                </ActionIcon>
                                            )}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )) : (
                                <TableEmpty colSpan={7} message={users.length === 0 ? "No users found" : "No users match the selected filters"} />
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Edit Modal */}
            <Modal isOpen={editOpened} onClose={() => setEditOpened(false)} title="Edit User">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Roles (Pilih satu atau lebih)</label>
                        <div className="space-y-2 p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto">
                            {roles.map((r) => {
                                const isChecked = selectedRoleCodes.includes(r.code);
                                return (
                                    <label key={r.id || r.code} className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                let updated: string[];
                                                if (e.target.checked) {
                                                    updated = [...selectedRoleCodes, r.code];
                                                } else {
                                                    updated = selectedRoleCodes.filter(c => c !== r.code);
                                                }
                                                setSelectedRoleCodes(updated);
                                                setEditFormData(prev => ({
                                                    ...prev,
                                                    role_codes: updated,
                                                    role_code: updated[0] || 'user'
                                                }));
                                            }}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="font-medium">{r.name}</span>
                                        <span className="text-xs text-slate-400 font-mono">(L{r.role_level})</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <Select
                        label="Department Restriction"
                        placeholder="No Restriction"
                        value={editFormData.department || ''}
                        onChange={(val) => setEditFormData({ ...editFormData, department: val || undefined })}
                        options={formDepartmentOptions}
                    />
                    <Select
                        label="Asset Group Restriction"
                        placeholder="No Restriction"
                        value={editFormData.allowed_asset_group || ''}
                        onChange={(val) => setEditFormData({ ...editFormData, allowed_asset_group: val || undefined })}
                        options={assetGroupOptions}
                    />
                    <Input
                        label="New Password (Optional)"
                        placeholder="Leave blank to keep current"
                        type="password"
                        value={editFormData.password || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value || undefined })}
                    />
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={editFormData.is_active ?? true}
                            onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-slate-300">Active Account</label>
                    </div>
                    <Button fullWidth onClick={handleUpdate} loading={submitting}>
                        Save Changes
                    </Button>
                </div>
            </Modal>

            {/* View Details Modal */}
            <Modal isOpen={viewOpened} onClose={() => setViewOpened(false)} title="User Profile Details">
                {selectedUser && (
                    <div className="space-y-6">
                        {/* Header Profile Info */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                            {selectedUser.employee_photo_url || (selectedUser as any).avatar_url ? (
                                <img
                                    src={getImageUrl(selectedUser.employee_photo_url || (selectedUser as any).avatar_url)}
                                    alt={selectedUser.name}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-cyan-500/30 shadow-inner shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/avatar-user.png';
                                    }}
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xl flex items-center justify-center border border-cyan-500/20 shadow-inner shrink-0">
                                    {selectedUser?.name ? selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white truncate">{selectedUser.name}</h3>
                                <p className="text-sm text-slate-400 truncate">{selectedUser.email}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <Badge variant={getRoleBadge(selectedUser.role_level)}>
                                        {getRoleLabel(selectedUser)}
                                    </Badge>
                                    <Badge variant={selectedUser.is_active ? 'success' : 'danger'}>
                                        {selectedUser.is_active ? 'Active Account' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Role & Access Level</span>
                                <p className="text-sm font-semibold text-white">{getAccessScope(selectedUser.role_code)}</p>
                            </div>

                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Department Scope</span>
                                {selectedUser.department ? (
                                    <Badge variant="info">Dept: {selectedUser.department}</Badge>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">All Departments (Unrestricted)</span>
                                )}
                            </div>

                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Asset Group Scope</span>
                                {selectedUser.allowed_asset_group ? (
                                    <Badge variant="warning">Asset: {selectedUser.allowed_asset_group}</Badge>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Full Access (Unrestricted)</span>
                                )}
                            </div>

                            <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Linked Employee Profile</span>
                                {selectedUser.employee_name ? (
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-400">{selectedUser.employee_name}</p>
                                        {selectedUser.employee_nik && (
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">NIK: {selectedUser.employee_nik}</p>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-500 italic">No Employee Linked</span>
                                )}
                            </div>
                        </div>

                        {/* Actions in Modal */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                            <Button variant="secondary" onClick={() => setViewOpened(false)}>
                                Close
                            </Button>
                            <Button onClick={() => { setViewOpened(false); openEditModal(selectedUser); }}>
                                Edit User
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
