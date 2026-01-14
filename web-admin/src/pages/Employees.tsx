// Employees Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, UserPlus, UserCheck } from 'lucide-react';
import { employeeApi, type Employee, type EmploymentStatus } from '../api/employee';
import { api } from '../api/client';
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

interface Department {
    id: string;
    name: string;
}

const initialFormState = {
    nik: '',
    name: '',
    email: '',
    phone: '',
    department_id: '',
    position: '',
    employment_status: 'pkwt' as EmploymentStatus,
    user_id: '',
};

const initialUserFormState = {
    email: '',
    password: '',
    name: '',
    role: 'staff',
    employee_id: '',
};

export function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    const [userFormData, setUserFormData] = useState(initialUserFormState);

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadData();
        fetchDepartments();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await employeeApi.list();
            setEmployees(data);
        } catch (error) {
            console.error(error);
            showError('Failed to load employees', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await api.get<Department[]>('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await employeeApi.create(formData);
            success('Employee created', 'Success');
            setModalOpen(false);
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to create employee', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingEmployee) return;
        setSubmitting(true);
        try {
            await employeeApi.update(editingEmployee.id, formData);
            success('Employee updated', 'Success');
            setModalOpen(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to update employee', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (employee: Employee) => {
        if (!window.confirm(`Are you sure you want to delete ${employee.name}?`)) return;
        try {
            await employeeApi.delete(employee.id);
            success('Employee deleted', 'Success');
            loadData();
        } catch (e: any) {
            showError('Failed to delete employee', 'Error');
        }
    };

    const openCreateModal = () => {
        setFormData(initialFormState);
        setEditingEmployee(null);
        setIsEditing(false);
        setModalOpen(true);
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsEditing(true);
        setFormData({
            nik: employee.nik,
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            department_id: employee.department_id || '',
            position: employee.position || '',
            employment_status: employee.employment_status,
            user_id: employee.user_id || '',
        });
        setModalOpen(true);
    };

    const openUserModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setUserFormData({
            ...initialUserFormState,
            name: employee.name,
            email: employee.email,
            employee_id: employee.id,
        });
        setUserModalOpen(true);
    };

    const handleCreateUser = async () => {
        setSubmitting(true);
        try {
            await employeeApi.createUser(userFormData);
            success('User account created', 'Success');
            setUserModalOpen(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to create user', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: EmploymentStatus): 'info' | 'success' | 'warning' | 'default' => {
        switch (status) {
            case 'pkwt': return 'info';
            case 'pkwtt': return 'success';
            case 'magang': return 'warning';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: EmploymentStatus) => {
        switch (status) {
            case 'pkwt': return 'PKWT';
            case 'pkwtt': return 'PKWTT';
            case 'magang': return 'Magang';
            default: return 'Lainnya';
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.nik.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
    );

    const deptOptions = departments.map(d => ({ value: d.id, label: d.name }));
    const statusOptions = [
        { value: 'pkwt', label: 'PKWT' },
        { value: 'pkwtt', label: 'PKWTT' },
        { value: 'magang', label: 'Magang' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Data Pegawai</h1>
                <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
                    Tambah Pegawai
                </Button>
            </div>

            <Card padding="lg">
                {/* Search */}
                <div className="mb-4">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari nama, NIK, atau email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="relative">
                    <LoadingOverlay visible={loading} />
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Nama / NIK</TableTh>
                                <TableTh>Email</TableTh>
                                <TableTh>Departemen</TableTh>
                                <TableTh>Jabatan</TableTh>
                                <TableTh>Status Kerja</TableTh>
                                <TableTh>User Akun</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh align="center">Aksi</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableTd>
                                        <div>
                                            <p className="font-medium text-white">{employee.name}</p>
                                            <p className="text-xs text-slate-500">{employee.nik}</p>
                                        </div>
                                    </TableTd>
                                    <TableTd>{employee.email}</TableTd>
                                    <TableTd>{employee.department_name || '-'}</TableTd>
                                    <TableTd>{employee.position || '-'}</TableTd>
                                    <TableTd>
                                        <Badge variant={getStatusBadge(employee.employment_status)}>
                                            {getStatusLabel(employee.employment_status)}
                                        </Badge>
                                    </TableTd>
                                    <TableTd>
                                        {employee.user_id ? (
                                            <Badge variant="success">
                                                <UserCheck size={12} className="mr-1" />
                                                Linked
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                leftIcon={<UserPlus size={14} />}
                                                onClick={() => openUserModal(employee)}
                                            >
                                                Buat Akun
                                            </Button>
                                        )}
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant={employee.is_active ? 'success' : 'danger'}>
                                            {employee.is_active ? 'Aktif' : 'Non-Aktif'}
                                        </Badge>
                                    </TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ActionIcon onClick={() => openEditModal(employee)} title="Edit">
                                                <Edit size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="danger" onClick={() => handleDelete(employee)} title="Delete">
                                                <Trash2 size={16} />
                                            </ActionIcon>
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )) : (
                                <TableEmpty colSpan={8} message="Tidak ada data pegawai" />
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={isEditing ? "Edit Pegawai" : "Tambah Pegawai"}
            >
                <div className="space-y-4">
                    <Input
                        label="NIK"
                        placeholder="Contoh: 123456"
                        value={formData.nik}
                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                        required
                    />
                    <Input
                        label="Nama"
                        placeholder="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        placeholder="email@perusahaan.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Telepon"
                        placeholder="0812..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Select
                        label="Departemen"
                        placeholder="Pilih Departemen"
                        value={formData.department_id}
                        onChange={(val) => setFormData({ ...formData, department_id: val || '' })}
                        options={deptOptions}
                    />
                    <Input
                        label="Jabatan"
                        placeholder="Contoh: Manager Operasional"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                    <Select
                        label="Status Kerja"
                        value={formData.employment_status}
                        onChange={(val) => setFormData({ ...formData, employment_status: (val as EmploymentStatus) || 'pkwt' })}
                        options={statusOptions}
                    />
                    <Button fullWidth onClick={isEditing ? handleUpdate : handleCreate} loading={submitting}>
                        {isEditing ? "Update" : "Simpan"}
                    </Button>
                </div>
            </Modal>

            {/* User Account Modal */}
            <Modal
                isOpen={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                title="Buat Akun User"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                        Membuat akun untuk pegawai: <strong className="text-white">{editingEmployee?.name}</strong>
                    </p>
                    <Input
                        label="Email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Password"
                        placeholder="Password login"
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        required
                    />
                    <Select
                        label="Role"
                        value={userFormData.role}
                        onChange={(val) => setUserFormData({ ...userFormData, role: val || 'staff' })}
                        options={[
                            { value: 'staff', label: 'Staff' },
                            { value: 'technician', label: 'Technician' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' },
                        ]}
                    />
                    <Button fullWidth onClick={handleCreateUser} loading={submitting}>
                        Buat Akun
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
