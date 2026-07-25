// Users Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Edit, Trash2, Link, UserCheck } from 'lucide-react';
import { usersApi, type UserSummary, type CreateUserRequest, type UpdateUserRequest } from '../api/users';
import { employeeApi, type Employee } from '../api/employee';
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

const initialFormState: CreateUserRequest = {
    email: '',
    password: '',
    name: '',
    role_code: 'user',
    employee_id: undefined,
    allowed_asset_group: undefined,
};

export default function Users() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserSummary[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);

    const [createOpened, setCreateOpened] = useState(false);
    const [editOpened, setEditOpened] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
    const [formData, setFormData] = useState<CreateUserRequest>(initialFormState);
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
            const [usersRes, rolesRes, employeesRes] = await Promise.all([
                usersApi.list(1, 100),
                usersApi.listRoles(),
                employeeApi.list()
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

            if (Array.isArray(employeesRes)) {
                setEmployees(employeesRes);
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
            filtered = filtered.filter(u => u.role_code === filterRole);
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

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await usersApi.create(formData);
            success('User created successfully', 'Success');
            setCreateOpened(false);
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to create user', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingUser) return;
        setSubmitting(true);
        try {
            await usersApi.update(editingUser.id, editFormData);
            success('User updated successfully', 'Success');
            setEditOpened(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to update user', 'Error');
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

    const openEditModal = (user: UserSummary) => {
        setEditingUser(user);
        setEditFormData({
            name: user.name,
            role_code: user.role_code,
            is_active: user.is_active,
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

    const roleOptions = roles.map(r => ({ value: r.code, label: `${r.name} (L${r.role_level})` }));

    // Get unique departments for filter
    const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));
    const departmentOptions = [
        { value: 'all', label: 'All Departments' },
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

    const employeeOptions = [
        { value: '', label: '-- Not Linked (No Employee) --' },
        ...employees.map(e => ({
            value: e.id,
            label: `${e.name} (NIK: ${e.nik || 'N/A'})`
        }))
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Operations</h1>
                    <p className="text-xs text-slate-400 mt-1">Manage system user accounts and their linked employee profiles.</p>
                </div>
                <Button onClick={() => setCreateOpened(true)}>
                    Create User
                </Button>
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
                                        <Badge variant={getRoleBadge(user.role_level)}>
                                            {user.role_code}
                                        </Badge>
                                    </TableTd>
                                    <TableTd>
                                        <span className="text-sm text-slate-400">
                                            {getAccessScope(user.role_code)}
                                        </span>
                                        {user.allowed_asset_group && (
                                            <div className="mt-1">
                                                <Badge variant="warning">{user.allowed_asset_group}</Badge>
                                            </div>
                                        )}
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                                            {user.is_active ? 'Allowed' : 'Denied'}
                                        </Badge>
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

            {/* Create Modal */}
            <Modal isOpen={createOpened} onClose={() => setCreateOpened(false)} title="Create New User">
                <div className="space-y-4">
                    <Input
                        label="Name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        placeholder="email@example.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Password"
                        placeholder="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <Select
                        label="Role"
                        placeholder="Select Role"
                        value={formData.role_code}
                        onChange={(val) => setFormData({ ...formData, role_code: val })}
                        options={roleOptions}
                    />
                    <Select
                        label="Link to Employee (Optional)"
                        placeholder="Select Employee to link"
                        value={formData.employee_id || ''}
                        onChange={(val) => setFormData({ ...formData, employee_id: val || undefined })}
                        options={employeeOptions}
                    />
                    <Select
                        label="Asset Group Restriction"
                        placeholder="No Restriction"
                        value={formData.allowed_asset_group || ''}
                        onChange={(val) => setFormData({ ...formData, allowed_asset_group: val || undefined })}
                        options={assetGroupOptions}
                    />
                    <Button fullWidth onClick={handleCreate} loading={submitting}>
                        Create User
                    </Button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editOpened} onClose={() => setEditOpened(false)} title="Edit User">
                <div className="space-y-4">
                    <Input
                        label="Name"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    />
                    <Select
                        label="Role"
                        value={editFormData.role_code || ''}
                        onChange={(val) => setEditFormData({ ...editFormData, role_code: val })}
                        options={roleOptions}
                    />
                    <Select
                        label="Linked Employee"
                        value={editFormData.employee_id || ''}
                        onChange={(val) => {
                            if (!val) {
                                setEditFormData({ ...editFormData, employee_id: undefined, clear_employee_link: true });
                            } else {
                                setEditFormData({ ...editFormData, employee_id: val, clear_employee_link: false });
                            }
                        }}
                        options={employeeOptions}
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
        </div>
    );
}
