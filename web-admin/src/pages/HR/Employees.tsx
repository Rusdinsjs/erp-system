// Employees Page - Pure Tailwind
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, UserPlus, UserCheck, Eye, Camera, Loader2 } from 'lucide-react';
import { employeeApi, type Employee, type EmploymentStatus } from '../../api/employee';
import { api } from '../../api/http';
import { uploadApi } from '../../api/upload';
import { getImageUrl } from '../../utils/image';
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
} from '../../components/ui';
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
    photo_url: '',

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

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [viewOpened, setViewOpened] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState(initialFormState);
    const [userFormData, setUserFormData] = useState(initialUserFormState);

    // Integrated User Creation State
    const [createUser, setCreateUser] = useState(false);
    const [userPassword, setUserPassword] = useState('');
    const [userRole, setUserRole] = useState('staff');

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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError('File harus berupa gambar (JPG, PNG, WebP, dll.)', 'Upload Error');
            return;
        }

        setUploadingPhoto(true);
        try {
            const res = await uploadApi.upload(file);
            setFormData(prev => ({ ...prev, photo_url: res.url }));
            success('Foto pegawai berhasil diupload', 'Success');
        } catch (err: any) {
            showError(err.response?.data?.message || 'Gagal mengupload foto', 'Upload Error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                user_creation: createUser ? {
                    email: formData.email || '',
                    password: userPassword,
                    role: userRole
                } : undefined
            };

            if (createUser && !userPassword) {
                showError('Password is required for user creation', 'Validation Error');
                setSubmitting(false);
                return;
            }

            await employeeApi.create(payload);
            success('Employee created', 'Success');
            setModalOpen(false);
            setFormData(initialFormState);
            setCreateUser(false);
            setUserPassword('');
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
            const payload = {
                ...formData,
                user_creation: createUser ? {
                    email: formData.email || '',
                    password: userPassword,
                    role: userRole
                } : undefined
            };

            if (createUser && !userPassword) {
                showError('Password is required for user creation', 'Validation Error');
                setSubmitting(false);
                return;
            }

            await employeeApi.update(editingEmployee.id, payload);
            success('Employee updated', 'Success');
            setModalOpen(false);
            setCreateUser(false);
            setUserPassword('');
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
        setCreateUser(false);
        setUserPassword('');
        setUserRole('staff');
        setModalOpen(true);
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsEditing(true);
        setFormData({
            ...initialFormState,
            ...employee,
            basic_salary: Number(employee.basic_salary) || 0,
        });
        setCreateUser(false);
        setUserPassword('');
        setUserRole('staff');
        setModalOpen(true);
    };

    const openViewModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setViewOpened(true);
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
                                        <div className="flex items-center gap-3">
                                            {employee.photo_url ? (
                                                <img
                                                    src={getImageUrl(employee.photo_url)}
                                                    alt={employee.name}
                                                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700/50 shadow-sm shrink-0"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/avatar-user.png';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/20 shrink-0">
                                                    {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-white">{employee.name}</p>
                                                <p className="text-xs text-slate-500">{employee.nik}</p>
                                            </div>
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
                                            <ActionIcon onClick={() => openViewModal(employee)} title="Lihat Detail Pegawai">
                                                <Eye size={16} />
                                            </ActionIcon>
                                            <ActionIcon onClick={() => openEditModal(employee)} title="Edit Pegawai">
                                                <Edit size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="danger" onClick={() => handleDelete(employee)} title="Hapus Pegawai">
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
                        <TabsTrigger value="user">User Account</TabsTrigger>
                    </TabsList>

                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* 1. PERSONAL DETAILS */}
                        <TabsContent value="personal" className="space-y-4">
                            {/* Photo Upload Section */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                                <div className="relative group shrink-0">
                                    {formData.photo_url ? (
                                        <img
                                            src={getImageUrl(formData.photo_url)}
                                            alt="Preview"
                                            className="w-16 h-16 rounded-full object-cover ring-2 ring-cyan-500/30 shadow-inner"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/avatar-user.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 font-semibold text-xs flex flex-col items-center justify-center border border-slate-700">
                                            <Camera size={20} className="mb-1 text-slate-500" />
                                            <span>Foto</span>
                                        </div>
                                    )}
                                    {uploadingPhoto && (
                                        <div className="absolute inset-0 bg-slate-950/80 rounded-full flex items-center justify-center">
                                            <Loader2 size={18} className="animate-spin text-cyan-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <span className="text-xs font-semibold text-slate-300 block">Foto Profil Pegawai</span>
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-sm">
                                            <Camera size={14} />
                                            <span>Upload Foto</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                            />
                                        </label>
                                        {formData.photo_url && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-rose-400 hover:text-rose-300"
                                                onClick={() => setFormData({ ...formData, photo_url: '' })}
                                            >
                                                Hapus Foto
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">Format: JPG, PNG, WEBP. Maks 5MB.</p>
                                </div>
                            </div>

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
                                    onChange={(val) => setFormData({ ...formData, blood_type: val || undefined })}
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
                                    label="Status Pernikahan"
                                    placeholder="Lajang / Menikah"
                                    value={formData.marital_status}
                                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                                />
                            </div>
                            <Input
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
                                    onChange={(val) => setFormData({ ...formData, department_id: val || undefined })}
                                    options={deptOptions}
                                />
                                <Input
                                    label="Jabatan / Posisi"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Status Kepegawaian"
                                    value={formData.employment_status}
                                    onChange={(val) => setFormData({ ...formData, employment_status: val as any })}
                                    options={statusOptions}
                                />
                                <DateInput
                                    label="Tanggal Mulai Kerja"
                                    value={formData.start_date}
                                    onChange={(val) => setFormData({ ...formData, start_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                                />
                            </div>
                            {formData.employment_status === 'pkwt' && (
                                <DateInput
                                    label="Tanggal Akhir Kontrak"
                                    value={formData.end_contract_date}
                                    onChange={(val) => setFormData({ ...formData, end_contract_date: val ? dayjs(val).format('YYYY-MM-DD') : '' })}
                                />
                            )}
                        </TabsContent>

                        {/* 3. CONTACT & EMERGENCY */}
                        <TabsContent value="contact" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Email Utama"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                <Input
                                    label="No. Telepon / HP"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <hr className="border-slate-700/50 my-2" />
                            <h4 className="text-sm font-medium text-slate-300">Kontak Darurat</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Nama Kontak Darurat"
                                    value={formData.emergency_contact_name}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                />
                                <Input
                                    label="No. HP Kontak Darurat"
                                    value={formData.emergency_contact_phone}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Hubungan Kontak Darurat"
                                placeholder="Misal: Orang Tua, Suami/Istri, Saudara"
                                value={formData.emergency_contact_relation}
                                onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                            />
                        </TabsContent>

                        {/* 4. PAYROLL & FINANCIAL */}
                        <TabsContent value="payroll" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Nama Bank"
                                    placeholder="BCA, Mandiri, BRI, dll."
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                                <Input
                                    label="No. Rekening Bank"
                                    value={formData.bank_account}
                                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Gaji Pokok"
                                type="number"
                                value={formData.basic_salary}
                                onChange={(e) => setFormData({ ...formData, basic_salary: Number(e.target.value) })}
                            />
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

                        {/* 5. USER ACCOUNT */}
                        <TabsContent value="user" className="space-y-4">
                            {isEditing && editingEmployee?.user_id ? (
                                <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center gap-3">
                                    <UserCheck className="text-sky-400 shrink-0" size={24} />
                                    <div>
                                        <p className="font-medium text-sky-400">Akun Terhubung</p>
                                        <p className="text-sm text-sky-200/70">
                                            Pegawai ini sudah memiliki akun login sistem.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-800/50 p-4 rounded-md border border-slate-700">
                                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                                        <input
                                            type="checkbox"
                                            checked={createUser}
                                            onChange={(e) => setCreateUser(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-white font-medium">Buat Akun Login untuk Pegawai ini</span>
                                    </label>

                                    {createUser && (
                                        <div className="space-y-4 pl-6 border-l-2 border-slate-700">
                                            <p className="text-sm text-slate-400">
                                                Email login akan menggunakan: <strong className="text-white">{formData.email || '(Isi email di tab Personal)'}</strong>
                                            </p>
                                            <Input
                                                label="Password"
                                                type="password"
                                                value={userPassword}
                                                onChange={(e) => setUserPassword(e.target.value)}
                                                placeholder="Password login..."
                                                required
                                            />
                                            <Select
                                                label="Role"
                                                value={userRole}
                                                onChange={(val) => setUserRole(val || 'staff')}
                                                options={[
                                                    { value: 'staff', label: 'Staff' },
                                                    { value: 'technician', label: 'Technician' },
                                                    { value: 'manager', label: 'Manager' },
                                                    { value: 'admin', label: 'Admin' },
                                                    { value: 'admin_heavy_eq', label: 'Admin Alat Berat' },
                                                    { value: 'admin_vehicle', label: 'Admin Kendaraan' },
                                                    { value: 'admin_infra', label: 'Admin Infrastruktur' },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
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

            {/* View Employee Details Modal */}
            <Modal
                isOpen={viewOpened}
                onClose={() => setViewOpened(false)}
                title="Detail Informasi Pegawai"
                size="lg"
            >
                {selectedEmployee && (
                    <div className="space-y-6">
                        {/* Profile Banner */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                            {selectedEmployee.photo_url ? (
                                <img
                                    src={getImageUrl(selectedEmployee.photo_url)}
                                    alt={selectedEmployee.name}
                                    className="w-16 h-16 rounded-full object-cover ring-2 ring-cyan-500/40 shadow-inner shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/avatar-user.png';
                                    }}
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xl flex items-center justify-center border border-cyan-500/20 shadow-inner shrink-0">
                                    {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white truncate">{selectedEmployee.name}</h3>
                                <p className="text-xs font-mono text-cyan-400 font-medium">NIK: {selectedEmployee.nik}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <Badge variant={getStatusBadge(selectedEmployee.employment_status)}>
                                        {getStatusLabel(selectedEmployee.employment_status)}
                                    </Badge>
                                    <Badge variant={selectedEmployee.is_active ? 'success' : 'danger'}>
                                        {selectedEmployee.is_active ? 'Aktif' : 'Non-Aktif'}
                                    </Badge>
                                    {selectedEmployee.department_name && (
                                        <Badge variant="info">Dept: {selectedEmployee.department_name}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Tabs */}
                        <Tabs defaultValue="personal" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="personal">Personal & Biodata</TabsTrigger>
                                <TabsTrigger value="employment">Pekerjaan</TabsTrigger>
                                <TabsTrigger value="contact">Kontak & Darurat</TabsTrigger>
                                <TabsTrigger value="payroll">Payroll & Bank</TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal" className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Nama Lengkap</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.name}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">No. KTP (NIK)</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.ktp_number || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Tempat, Tgl Lahir</span>
                                        <p className="text-sm font-semibold text-white">
                                            {selectedEmployee.place_of_birth || '-'}, {selectedEmployee.date_of_birth ? dayjs(selectedEmployee.date_of_birth).format('DD MMMM YYYY') : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Jenis Kelamin</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.gender === 'L' ? 'Laki-laki' : selectedEmployee.gender === 'P' ? 'Perempuan' : '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Agama & Gol. Darah</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.religion || '-'} (Gol. Darah: {selectedEmployee.blood_type || '-'})</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Status Pernikahan</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.marital_status || '-'}</p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Alamat Domisili</span>
                                    <p className="text-sm font-medium text-slate-200">{selectedEmployee.address || '-'}</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="employment" className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Departemen</span>
                                        <p className="text-sm font-semibold text-cyan-400">{selectedEmployee.department_name || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Jabatan</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.position || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Status Kepegawaian</span>
                                        <p className="text-sm font-semibold text-white">{getStatusLabel(selectedEmployee.employment_status)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Tanggal Mulai Kerja</span>
                                        <p className="text-sm font-semibold text-white">
                                            {selectedEmployee.start_date ? dayjs(selectedEmployee.start_date).format('DD MMMM YYYY') : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Sisa Cuti Tahunan</span>
                                        <p className="text-sm font-semibold text-emerald-400">{selectedEmployee.leave_balance ?? 12} Hari (Terpakai: {selectedEmployee.leave_used ?? 0})</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Akun User Login</span>
                                        {selectedEmployee.user_id ? (
                                            <Badge variant="success">Terhubung ke User Login</Badge>
                                        ) : (
                                            <span className="text-sm text-slate-500 italic">Belum Ada Akun Login</span>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="contact" className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Email Utama</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.email}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">No. Telepon / HP</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.phone || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Kontak Darurat (Nama)</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.emergency_contact_name || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Kontak Darurat (No & Hubungan)</span>
                                        <p className="text-sm font-semibold text-white">
                                            {selectedEmployee.emergency_contact_phone || '-'} ({selectedEmployee.emergency_contact_relation || '-'})
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="payroll" className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Bank & Rekening</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.bank_name || '-'} - {selectedEmployee.bank_account || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Gaji Pokok</span>
                                        <p className="text-sm font-semibold text-emerald-400">
                                            {selectedEmployee.basic_salary ? `Rp ${Number(selectedEmployee.basic_salary).toLocaleString('id-ID')}` : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">BPJS Kesehatan</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.bpjs_kesehatan || '-'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">BPJS Ketenagakerjaan</span>
                                        <p className="text-sm font-semibold text-white">{selectedEmployee.bpjs_tenaga_kerja || '-'}</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Modal Footer Actions */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                            <Button variant="secondary" onClick={() => setViewOpened(false)}>
                                Tutup
                            </Button>
                            <Button onClick={() => { setViewOpened(false); openEditModal(selectedEmployee); }}>
                                Edit Pegawai
                            </Button>
                        </div>
                    </div>
                )}
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
                            { value: 'admin_heavy_eq', label: 'Admin Alat Berat' },
                            { value: 'admin_vehicle', label: 'Admin Kendaraan' },
                            { value: 'admin_infra', label: 'Admin Infrastruktur' },
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
