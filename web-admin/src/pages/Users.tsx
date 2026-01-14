// Users Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { usersApi, type UserSummary, type CreateUserRequest, type UpdateUserRequest } from '../api/users';
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
};

export function Users() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);

    const [createOpened, setCreateOpened] = useState(false);
    const [editOpened, setEditOpened] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
    const [formData, setFormData] = useState<CreateUserRequest>(initialFormState);
    const [editFormData, setEditFormData] = useState<UpdateUserRequest>({});

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                usersApi.list(1, 50),
                usersApi.listRoles()
            ]);

            if (usersRes && Array.isArray(usersRes.data)) {
                setUsers(usersRes.data);
            } else if (Array.isArray(usersRes)) {
                setUsers(usersRes);
            }

            if (Array.isArray(rolesRes)) {
                setRoles(rolesRes);
            }
        } catch (error) {
            console.error(error);
            showError('Failed to load data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await usersApi.create(formData);
            success('User created', 'Success');
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
            success('User updated', 'Success');
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
            case 'admin_heavy_eq': return 'Heavy Equipment Specialist';
            case 'admin_vehicle': return 'Vehicle Specialist';
            case 'admin_infra': return 'Infrastructure Specialist';
            case 'technician': return 'Maintenance Execution';
            case 'staff': return 'General Staff View';
            case 'user': return 'Basic View Access';
            default: return 'Limited Access';
        }
    };

    const roleOptions = roles.map(r => ({ value: r.code, label: `${r.name} (L${r.role_level})` }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">User Management</h1>
            </div>

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
                            {users.length > 0 ? users.map((user) => (
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
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                                            {user.is_active ? 'Allowed' : 'Denied'}
                                        </Badge>
                                    </TableTd>
                                    <TableTd>
                                        {user.employee_name ? (
                                            <div>
                                                <p className="text-sm text-white">{user.employee_name}</p>
                                                {user.employee_nik && (
                                                    <p className="text-xs text-slate-500">NIK: {user.employee_nik}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500 italic">Not Linked</span>
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
                                <TableEmpty colSpan={7} message="No users found" />
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
                    <Input
                        label="New Password (Optional)"
                        placeholder="Leave blank to keep current"
                        type="password"
                        value={editFormData.password || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value || undefined })}
                    />
                    <div className="flex items-center gap-2">
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
