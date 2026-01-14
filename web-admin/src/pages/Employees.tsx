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
    Tabs, TabsList, TabsTrigger, TabsContent,
    DateInput,
    Textarea
} from '../components/ui';
import dayjs from 'dayjs';

interface Department {
    id: string;
    name: string;
}

const initialFormState: Partial<Employee> = {
    nik: '',
    name: '',
    email: '',
    phone: '',
    department_id: '',
    position: '',
    employment_status: 'pkwt',
    user_id: '',

    // Biodata
    ktp_number: '',
    place_of_birth: '',
    date_of_birth: '',
    gender: 'L',
    marital_status: '',
    religion: '',
    address: '',
    blood_type: '',

    // Emergency
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',

    // Employment
    start_date: '',
    end_contract_date: '',
    is_manager: false,
    manager_id: '',

    // Payroll
    bank_account: '',
    bank_name: '',
    npwp: '',
    bpjs_kesehatan: '',
    bpjs_tenaga_kerja: '',
    basic_salary: 0,
    education: '',
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
            ...initialFormState, // Fill with defaults for new fields
            ...employee, // Overwrite with existing data
            basic_salary: Number(employee.basic_salary) || 0, // Ensure number
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

    const genderOptions = [
        { value: 'L', label: 'Laki-laki' },
        { value: 'P', label: 'Perempuan' },
    ];

    const bloodOptions = [
        { value: 'A', label: 'A' },
        { value: 'B', label: 'B' },
        { value: 'AB', label: 'AB' },
        { value: 'O', label: 'O' },
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
                <div className="mb-4">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input
                            placeholder="Cari nama, NIK, atau email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

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
                                                Account
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

            {/* Create/Edit Modal with Tabs */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={isEditing ? "Edit Pegawai" : "Tambah Pegawai"}
                size="lg"
            >
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="employment">Pekerjaan</TabsTrigger>
                        <TabsTrigger value="contact">Kontak</TabsTrigger>
                        <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    </TabsList>

                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* 1. PERSONAL DETAILS */}
                        <TabsContent value="personal" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="NIK"
                                    placeholder="Nomor Induk Karyawan"
                                    value={formData.nik}
                                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                    required
                                />
                                <Input
                                    label="KTP (NIK)"
                                    placeholder="Nomor Identitas Kependudukan"
                                    value={formData.ktp_number}
                                    onChange={(e) => setFormData({ ...formData, ktp_number: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Nama Lengkap"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tempat Lahir"
                                    value={formData.place_of_birth}
                                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                                />
                                <DateInput
                                    label="Tanggal Lahir"
                                    value={formData.date_of_birth}
                                    onChange={(val) => setFormData({ ...formData, date_of_birth: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Jenis Kelamin"
                                    value={formData.gender}
                                    onChange={(val) => setFormData({ ...formData, gender: val as any })}
                                    options={genderOptions}
                                />
                                <Select
                                    label="Golongan Darah"
                                    value={formData.blood_type}
                                    onChange={(val) => setFormData({ ...formData, blood_type: val })}
                                    options={bloodOptions}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Agama"
                                    value={formData.religion}
                                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                                />
                                <Input
                                    label="Status Perkawinan"
                                    placeholder="Lajang/Menikah..."
                                    value={formData.marital_status}
                                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                                />
                            </div>
                            <Textarea
                                label="Alamat Domisili"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </TabsContent>

                        {/* 2. EMPLOYMENT DETAILS */}
                        <TabsContent value="employment" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Departemen"
                                    value={formData.department_id}
                                    onChange={(val) => setFormData({ ...formData, department_id: val || '' })}
                                    options={deptOptions}
                                />
                                <Input
                                    label="Jabatan"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Status Karyawan"
                                    value={formData.employment_status}
                                    onChange={(val) => setFormData({ ...formData, employment_status: (val as EmploymentStatus) || 'pkwt' })}
                                    options={statusOptions}
                                />
                                <Input
                                    label="Pendidikan Terakhir"
                                    value={formData.education}
                                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DateInput
                                    label="Tanggal Masuk"
                                    value={formData.start_date}
                                    onChange={(val) => setFormData({ ...formData, start_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                                />
                                <DateInput
                                    label="Akhir Kontrak"
                                    value={formData.end_contract_date}
                                    onChange={(val) => setFormData({ ...formData, end_contract_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Email Kantor"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </TabsContent>

                        {/* 3. CONTACT & EMERGENCY */}
                        <TabsContent value="contact" className="space-y-4">
                            <Input
                                label="No. Telepon / WhatsApp"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <div className="border-t border-slate-700 pt-4">
                                <h4 className="text-sm font-semibold text-slate-300 mb-2">Kontak Darurat</h4>
                                <div className="space-y-3">
                                    <Input
                                        label="Nama Kontak Darurat"
                                        value={formData.emergency_contact_name}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="No. Telepon"
                                            value={formData.emergency_contact_phone}
                                            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                        />
                                        <Input
                                            label="Hubungan"
                                            placeholder="Ortu/Istri/Suami..."
                                            value={formData.emergency_contact_relation}
                                            onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 4. PAYROLL */}
                        <TabsContent value="payroll" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Nama Bank"
                                    placeholder="BCA/Mandiri..."
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                                <Input
                                    label="No. Rekening"
                                    value={formData.bank_account}
                                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="NPWP"
                                    value={formData.npwp}
                                    onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                                />
                                <Input
                                    label="Gaji Pokok"
                                    type="number"
                                    value={formData.basic_salary}
                                    onChange={(e) => setFormData({ ...formData, basic_salary: Number(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="BPJS Kesehatan"
                                    value={formData.bpjs_kesehatan}
                                    onChange={(e) => setFormData({ ...formData, bpjs_kesehatan: e.target.value })}
                                />
                                <Input
                                    label="BPJS Ketenagakerjaan"
                                    value={formData.bpjs_tenaga_kerja}
                                    onChange={(e) => setFormData({ ...formData, bpjs_tenaga_kerja: e.target.value })}
                                />
                            </div>
                        </TabsContent>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={isEditing ? handleUpdate : handleCreate} loading={submitting}>
                            {isEditing ? "Update Pegawai" : "Simpan Pegawai"}
                        </Button>
                    </div>
                </Tabs>
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
