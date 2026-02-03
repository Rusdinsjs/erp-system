// Loans Page - Pure Tailwind
import { useEffect, useState, useMemo } from 'react';
import { Plus, Eye, Check, X, Hand, HandMetal, Search, Briefcase, Clock, AlertTriangle, Camera } from 'lucide-react';
import { loanApi, type Loan } from '../api/loan';
import { assetApi } from '../api/assets';
import { employeeApi, type Employee } from '../api/employee';
import { useAuthStore } from '../store/useAuthStore';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Select,
    Textarea,
    DateInput,
    Checkbox,
    LoadingOverlay,
    useToast,
} from '../components/ui';

interface Asset {
    id: string;
    name: string;
    asset_code: string;
    status: string;
    is_loan?: boolean;
}

const statusBadgeVariant: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    requested: 'warning',
    approved: 'info',
    checked_out: 'info',
    in_use: 'success',
    overdue: 'danger',
    returned: 'success',
    rejected: 'default',
    lost: 'danger',
    damaged: 'warning',
};

export default function Loans() {
    const user = useAuthStore((state) => state.user);
    const { success, error: showError } = useToast();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [borrowerType, setBorrowerType] = useState<'self' | 'employee'>('self');

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [actionModalOpen, setActionModalOpen] = useState(false);

    // Form state
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [actionType, setActionType] = useState<'checkout' | 'return' | 'reject' | null>(null);
    const [conditionNote, setConditionNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Create form
    const [newLoan, setNewLoan] = useState({
        asset_id: '',
        employee_id: '',
        loan_date: new Date(),
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [loansRes, assetsRes, employeesRes] = await Promise.all([
                activeTab === 'overdue' ? loanApi.listOverdue() : loanApi.list(),
                assetApi.list({ page: 1, per_page: 200, is_loan: true }),
                employeeApi.list(),
            ]);
            setLoans(Array.isArray(loansRes) ? loansRes : []);
            setAssets(Array.isArray(assetsRes) ? assetsRes : (assetsRes as any).data?.data || (assetsRes as any).data || []);
            setEmployees(employeesRes);
        } catch (error) {
            console.error(error);
            showError('Failed to load data', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        total: loans.length,
        pending: loans.filter(l => l.status === 'requested').length,
        active: loans.filter(l => ['checked_out', 'in_use'].includes(l.status)).length,
        overdue: loans.filter(l => l.status === 'overdue').length,
    }), [loans]);

    const filteredLoans = useMemo(() => {
        return loans.filter(loan => {
            const assetName = (loan.asset_name || getAssetName(loan.asset_id)).toLowerCase();
            const borrowerName = (loan.employee_name || loan.borrower_name || '').toLowerCase();
            const query = search.toLowerCase();
            return assetName.includes(query) || borrowerName.includes(query);
        });
    }, [loans, search, assets]);

    const handleCreate = async () => {
        if (!newLoan.asset_id) {
            showError('Please select an asset', 'Error');
            return;
        }
        setSubmitting(true);
        try {
            await loanApi.create({
                asset_id: newLoan.asset_id,
                borrower_id: borrowerType === 'self' ? (user?.id || '') : undefined,
                employee_id: borrowerType === 'employee' ? newLoan.employee_id : undefined,
                loan_date: newLoan.loan_date.toISOString().split('T')[0],
                expected_return_date: newLoan.expected_return_date.toISOString().split('T')[0],
            });
            success('Loan request created', 'Success');
            setCreateModalOpen(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Failed to create loan', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await loanApi.approve(id);
            success('Loan approved', 'Success');
            loadData();
        } catch (e: any) {
            showError('Failed to approve', 'Error');
        }
    };

    const handleAction = async () => {
        if (!selectedLoan || !actionType) return;
        if (actionType === 'checkout' && !termsAccepted) {
            showError('Please accept terms and confirm asset condition', 'Warning');
            return;
        }
        setSubmitting(true);
        try {
            const photoUrls: string[] = [];
            if (imageFiles.length > 0) {
                // Upload sequentially
                for (const file of imageFiles) {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', file);
                    const uploadRes = await import('../api/http').then(m => m.api.post('/upload', uploadFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }));
                    photoUrls.push(uploadRes.data.url);
                }
            }

            if (actionType === 'checkout') {
                await loanApi.checkout(selectedLoan.id, conditionNote, photoUrls);
                success('Asset checked out', 'Success');
            } else if (actionType === 'return') {
                await loanApi.returnLoan(selectedLoan.id, conditionNote, photoUrls);
                success('Asset returned', 'Success');
            } else if (actionType === 'reject') {
                await loanApi.reject(selectedLoan.id, rejectReason);
                success('Loan rejected', 'Success');
            }
            setActionModalOpen(false);
            loadData();
        } catch (e: any) {
            showError(e.response?.data?.message || 'Action failed', 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const openActionModal = (loan: Loan, type: 'checkout' | 'return' | 'reject') => {
        setSelectedLoan(loan);
        setActionType(type);
        setConditionNote('');
        setRejectReason('');
        setTermsAccepted(false);
        setTermsAccepted(false);
        setImageFiles([]);
        setPreviewUrls([]);
        setActionModalOpen(true);
    };

    function getAssetName(assetId: string) {
        const asset = assets.find((a) => a.id === assetId);
        return asset ? `${asset.asset_code} - ${asset.name}` : assetId;
    }

    const availableAssets = assets.filter((a) => ['in_inventory', 'available'].includes(a.status) && a.is_loan === true);

    const TabButton = ({ value, children, count, danger }: { value: string; children: React.ReactNode; count?: number; danger?: boolean }) => (
        <button
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === value
                ? danger ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${danger ? 'bg-red-500/30' : 'bg-slate-700'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen Peminjaman (Internal Loan)</h1>
                    <p className="text-sm text-slate-400">Kelola peminjaman aset kantor oleh karyawan</p>
                </div>
                <Button leftIcon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
                    Request Pinjaman Baru
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Total Loans</span>
                        <Briefcase size={20} className="text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{stats.total}</p>
                </Card>
                <Card padding="md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Pending Approval</span>
                        <Clock size={20} className="text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-amber-400 mt-2">{stats.pending}</p>
                </Card>
                <Card padding="md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Active / In-Use</span>
                        <Hand size={20} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400 mt-2">{stats.active}</p>
                </Card>
                <Card padding="md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Overdue</span>
                        <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-400 mt-2">{stats.overdue}</p>
                </Card>
            </div>

            {/* Main Card */}
            <Card padding="lg">
                <div className="relative">
                    <LoadingOverlay visible={loading} />

                    {/* Tabs & Search */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <TabButton value="all">Semua Data</TabButton>
                            <TabButton value="requested" count={stats.pending}>Requests</TabButton>
                            <TabButton value="overdue" count={stats.overdue} danger>Terlambat</TabButton>
                        </div>
                        <div className="relative w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Cari aset atau peminjam..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Aset / Peminjam</TableTh>
                                <TableTh>Tanggal Pinjam</TableTh>
                                <TableTh>Batas Kembali</TableTh>
                                <TableTh>Tgl Dikembalikan</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh align="center">Tindakan</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLoans.length > 0 ? filteredLoans.map((loan) => (
                                <TableRow key={loan.id}>
                                    <TableTd>
                                        <div>
                                            <p className="font-medium text-white">{loan.asset_name || getAssetName(loan.asset_id)}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-500">{loan.employee_name || loan.borrower_name || 'Anonymous'}</span>
                                                {loan.employee_id && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md border border-slate-700">
                                                        {employees.find(e => e.id === loan.employee_id)?.nik || 'NIK...'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableTd>
                                    <TableTd>{loan.loan_date}</TableTd>
                                    <TableTd>
                                        <span className={loan.status === 'overdue' ? 'text-red-400' : ''}>
                                            {loan.expected_return_date}
                                        </span>
                                    </TableTd>
                                    <TableTd>
                                        <span className={loan.actual_return_date ? 'text-emerald-400' : 'text-slate-500'}>
                                            {loan.actual_return_date || '-'}
                                        </span>
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant={statusBadgeVariant[loan.status] || 'default'}>
                                            {loan.status.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ActionIcon onClick={() => { setSelectedLoan(loan); setDetailModalOpen(true); }} title="View Details">
                                                <Eye size={16} />
                                            </ActionIcon>
                                            {loan.status === 'requested' && (
                                                <>
                                                    <ActionIcon variant="success" onClick={() => handleApprove(loan.id)} title="Approve">
                                                        <Check size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="danger" onClick={() => openActionModal(loan, 'reject')} title="Reject">
                                                        <X size={16} />
                                                    </ActionIcon>
                                                </>
                                            )}
                                            {loan.status === 'approved' && (
                                                <ActionIcon onClick={() => openActionModal(loan, 'checkout')} title="Checkout">
                                                    <Hand size={16} />
                                                </ActionIcon>
                                            )}
                                            {['checked_out', 'in_use', 'overdue'].includes(loan.status) && (
                                                <ActionIcon variant="success" onClick={() => openActionModal(loan, 'return')} title="Return">
                                                    <HandMetal size={16} />
                                                </ActionIcon>
                                            )}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )) : (
                                <TableEmpty colSpan={5} message="Tidak ada data peminjaman ditemukan" />
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Create Modal */}
            <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Request Peminjaman Aset">
                <div className="space-y-4">
                    <Select
                        label="Pilih Aset"
                        placeholder="Cari aset..."
                        value={newLoan.asset_id}
                        onChange={(val) => setNewLoan({ ...newLoan, asset_id: val })}
                        options={availableAssets.map((a) => ({ value: a.id, label: `${a.asset_code} - ${a.name}` }))}
                        required
                    />
                    <Select
                        label="Siapa yang meminjam?"
                        value={borrowerType}
                        onChange={(val) => setBorrowerType(val as any)}
                        options={[
                            { value: 'self', label: 'Diri Sendiri' },
                            { value: 'employee', label: 'Pegawai Lain' },
                        ]}
                    />
                    {borrowerType === 'employee' && (
                        <Select
                            label="Pilih Pegawai"
                            placeholder="Cari pegawai..."
                            value={newLoan.employee_id}
                            onChange={(val) => setNewLoan({ ...newLoan, employee_id: val })}
                            options={employees.map((e) => ({ value: e.id, label: `${e.nik} - ${e.name}` }))}
                            required
                        />
                    )}
                    <DateInput
                        label="Tanggal Mulai Pinjam"
                        value={newLoan.loan_date}
                        onChange={(val) => val && setNewLoan({ ...newLoan, loan_date: val })}
                    />
                    <DateInput
                        label="Estimasi Tanggal Kembali"
                        value={newLoan.expected_return_date}
                        onChange={(val) => val && setNewLoan({ ...newLoan, expected_return_date: val })}
                    />
                    <Textarea label="Keperluan Pinjam" placeholder="Contoh: Untuk operasional lapangan site A" />
                    <Button fullWidth onClick={handleCreate} loading={submitting}>
                        Kirim Permintaan
                    </Button>
                </div>
            </Modal>

            {/* Action Modal */}
            <Modal
                isOpen={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                title={
                    actionType === 'checkout' ? 'Konfirmasi Serah Terima Aset' :
                        actionType === 'return' ? 'Konfirmasi Pengembalian Aset' : 'Tolak Permintaan'
                }
            >
                <div className="space-y-4">
                    {actionType === 'reject' ? (
                        <Textarea
                            label="Alasan Penolakan"
                            placeholder="Tuliskan alasan permintaan ditolak..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                        />
                    ) : (
                        <>
                            <p className="text-sm text-slate-400">
                                Silakan periksa kondisi fisik aset sebelum melakukan konfirmasi.
                            </p>
                            <Textarea
                                label="Catatan Kondisi Aset"
                                placeholder={actionType === 'checkout' ? 'Catat kondisi fisik (misal: ada goresan, baterai 80%)' : 'Catat kondisi saat dikembalikan'}
                                value={conditionNote}
                                onChange={(e) => setConditionNote(e.target.value)}
                                required
                            />
                            {actionType === 'checkout' && (
                                <Checkbox
                                    label="Saya mengkonfirmasi bahwa aset telah diserahkan dalam kondisi baik dan peminjam menyetujui syarat & ketentuan."
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                />
                            )}

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300">Foto Kondisi Aset (Opsional)</label>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-300">Foto Kondisi Aset</label>
                                        <span className="text-xs text-slate-500">{imageFiles.length} foto dipilih</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {previewUrls.map((url, idx) => (
                                            <div key={idx} className="relative group aspect-square">
                                                <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded-lg border border-slate-700" />
                                                <button
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="relative group aspect-square">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={handleFileChange}
                                            />
                                            <div className="w-full h-full border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 transition-all">
                                                <Camera size={20} />
                                                <span className="text-[10px] mt-1">Tambah</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <Button
                        fullWidth
                        variant={actionType === 'reject' ? 'danger' : 'primary'}
                        onClick={handleAction}
                        loading={submitting}
                    >
                        {actionType === 'checkout' ? 'Konfirmasi Serah Terima' : actionType === 'return' ? 'Selesaikan Peminjaman' : 'Tolak'}
                    </Button>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Detail Peminjaman" size="lg">
                {selectedLoan && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-lg">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Aset</p>
                                <p className="font-medium text-white">{getAssetName(selectedLoan.asset_id)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Peminjam</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-white">{selectedLoan.employee_name || selectedLoan.borrower_name || 'Anonymous'}</p>
                                    {selectedLoan.employee_id && (
                                        <Badge variant="default" className="text-[10px]">
                                            {employees.find(e => e.id === selectedLoan.employee_id)?.nik}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Status</p>
                                <Badge variant={statusBadgeVariant[selectedLoan.status] || 'default'} className="mt-1">
                                    {selectedLoan.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">No. Referensi</p>
                                <p className="text-sm text-white">{selectedLoan.loan_number || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-800 my-4" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Tanggal Pinjam</p>
                                <p className="text-sm text-white">{selectedLoan.loan_date}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Estimasi Kembali</p>
                                <p className="text-sm text-white">{selectedLoan.expected_return_date}</p>
                            </div>
                        </div>

                        {selectedLoan.condition_before && (
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Kondisi Saat Keluar</p>
                                <div className="mt-1 p-3 bg-slate-900/50 rounded-lg space-y-3">
                                    <p className="text-sm text-slate-300">{selectedLoan.condition_before}</p>
                                    {selectedLoan.check_out_photos && selectedLoan.check_out_photos.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Foto Handover</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {selectedLoan.check_out_photos.map((photo, i) => (
                                                    <img
                                                        key={i}
                                                        src={photo}
                                                        alt={`Handover ${i}`}
                                                        className="w-full h-20 object-cover rounded-md border border-slate-800 cursor-pointer"
                                                        onClick={() => window.open(photo, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedLoan.condition_after && (
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Kondisi Saat Kembali</p>
                                <div className="mt-1 p-3 bg-slate-900/50 rounded-lg space-y-3">
                                    <p className="text-sm text-slate-300">{selectedLoan.condition_after}</p>
                                    {selectedLoan.return_photos && selectedLoan.return_photos.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Foto Pengembalian</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {selectedLoan.return_photos.map((photo, i) => (
                                                    <img
                                                        key={i}
                                                        src={photo}
                                                        alt={`Return ${i}`}
                                                        className="w-full h-20 object-cover rounded-md border border-slate-800 cursor-pointer"
                                                        onClick={() => window.open(photo, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Tutup</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
