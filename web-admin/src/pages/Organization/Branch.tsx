// Branch Management — mirrors Company structure with entity_type = 'BRANCH'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, RefreshCw, Building2, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react';
import { api } from '../../api/http';
import { fetchCompanies } from '../../api/companyApi';
import type { Company } from '../../api/companyApi';
import {
    Button, Card, Modal, useToast,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge, ActionIcon, GlobalSearch,
} from '../../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
    id: string;
    code: string;
    name: string;
    legal_name?: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    country?: string;
    // Akta Pendirian
    establishment_deed_no?: string;
    establishment_deed_date?: string;
    establishment_notary_name?: string;
    establishment_approval_no?: string;
    parent_company_id?: string;
    parent_company_name?: string;
    incorporation_date?: string;
    registration_no?: string;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
}

type BranchPayload = Omit<Branch, 'id' | 'created_at' | 'updated_at' | 'parent_company_name'>;

const EMPTY_FORM: BranchPayload = {
    code: '',
    name: '',
    legal_name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    country: 'Indonesia',
    establishment_deed_no: '',
    establishment_deed_date: '',
    establishment_notary_name: '',
    establishment_approval_no: '',
    parent_company_id: '',
    incorporation_date: '',
    registration_no: '',
    status: 'ACTIVE',
};

// ─── API helpers (branches share /companies endpoint with is_group=false logic,
//     but we treat them via a dedicated /branches endpoint when backend is ready.
//     For now we proxy via /companies?entity_type=BRANCH) ─────────────────────
const branchApi = {
    list: async (params?: { search?: string; status?: string }) => {
        // If backend exposes /branches, swap the URL here.
        const res = await api.get('/companies', { params: { ...params, is_group: false } });
        return (res.data as Company[]).filter((c: any) => c.entity_type === 'BRANCH' || !c.is_group);
    },
    create: async (payload: BranchPayload) => {
        const res = await api.post('/companies', { ...payload, is_group: false, entity_type: 'BRANCH' });
        return res.data;
    },
    update: async (id: string, payload: BranchPayload) => {
        const res = await api.put(`/companies/${id}`, { ...payload, is_group: false, entity_type: 'BRANCH' });
        return res.data;
    },
    delete: async (id: string) => {
        const res = await api.delete(`/companies/${id}`);
        return res.data;
    },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Branch() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [search, setSearch] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<Branch | null>(null);
    const [editing, setEditing] = useState<Branch | null>(null);
    const [form, setForm] = useState<BranchPayload>(EMPTY_FORM);
    const [activeTab, setActiveTab] = useState<'basic' | 'legal' | 'akta'>('basic');

    // Queries
    const { data: branches = [], isLoading } = useQuery({
        queryKey: ['branches', search],
        queryFn: () => branchApi.list({ search }),
        staleTime: 30_000,
    });

    const { data: companies = [] } = useQuery({
        queryKey: ['companies-list'],
        queryFn: () => fetchCompanies({ status: 'ACTIVE' }),
        staleTime: 60_000,
    });

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (data: BranchPayload) =>
            editing ? branchApi.update(editing.id, data) : branchApi.create(data),
        onSuccess: () => {
            success(editing ? 'Cabang berhasil diperbarui' : 'Cabang baru berhasil dibuat', 'Berhasil');
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            closeDrawer();
        },
        onError: (err: any) => showError(err?.message || 'Terjadi kesalahan', 'Error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => branchApi.delete(id),
        onSuccess: () => {
            success('Cabang berhasil dihapus', 'Berhasil');
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            setDeleteModal(null);
        },
        onError: (err: any) => showError(err?.message || 'Gagal menghapus', 'Error'),
    });

    // Handlers
    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setActiveTab('basic'); setDrawerOpen(true); };
    const openEdit = (b: Branch) => {
        setEditing(b);
        setForm({
            code: b.code,
            name: b.name,
            legal_name: b.legal_name || '',
            tax_id: b.tax_id || '',
            address: b.address || '',
            phone: b.phone || '',
            email: b.email || '',
            website: b.website || '',
            country: b.country || 'Indonesia',
            establishment_deed_no: b.establishment_deed_no || '',
            establishment_deed_date: b.establishment_deed_date || '',
            establishment_notary_name: b.establishment_notary_name || '',
            establishment_approval_no: b.establishment_approval_no || '',
            parent_company_id: b.parent_company_id || '',
            incorporation_date: b.incorporation_date || '',
            registration_no: b.registration_no || '',
            status: b.status,
        });
        setActiveTab('basic');
        setDrawerOpen(true);
    };
    const closeDrawer = () => { setDrawerOpen(false); setEditing(null); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(form); };
    const f = (key: keyof BranchPayload, val: any) => setForm(p => ({ ...p, [key]: val }));

    const companyOptions = Array.isArray(companies)
        ? companies.map((c: Company) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
        : [];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-blue-600" />
                        Branch Management
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Kelola cabang-cabang perusahaan beserta legalitas dan informasinya
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['branches'] })}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah Cabang
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <GlobalSearch value={search} onChange={setSearch} placeholder="Cari nama, kode, atau kota cabang..." />
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Kode</TableTh>
                            <TableTh>Nama Cabang</TableTh>
                            <TableTh>Perusahaan Induk</TableTh>
                            <TableTh>Kota / Alamat</TableTh>
                            <TableTh>Kontak</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Aksi</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableTd colSpan={7} className="text-center py-12 text-muted-foreground">
                                    Memuat data...
                                </TableTd>
                            </TableRow>
                        ) : branches.length === 0 ? (
                            <TableEmpty colSpan={7} message="Belum ada cabang. Klik 'Tambah Cabang' untuk memulai." />
                        ) : (
                            branches.map((b: Branch) => (
                                <TableRow key={b.id}>
                                    <TableTd className="font-mono font-semibold text-xs">{b.code}</TableTd>
                                    <TableTd>
                                        <div className="font-medium text-foreground">{b.name}</div>
                                        {b.legal_name && <div className="text-xs text-muted-foreground">{b.legal_name}</div>}
                                    </TableTd>
                                    <TableTd className="text-sm text-muted-foreground">{b.parent_company_name || '—'}</TableTd>
                                    <TableTd>
                                        {b.address ? (
                                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span className="line-clamp-2">{b.address}</span>
                                            </div>
                                        ) : '—'}
                                    </TableTd>
                                    <TableTd>
                                        <div className="space-y-0.5 text-xs text-muted-foreground">
                                            {b.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</div>}
                                            {b.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{b.email}</div>}
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        <StatusBadge status={b.status === 'ACTIVE' ? 'active' : 'inactive'}>
                                            {b.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif'}
                                        </StatusBadge>
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <ActionIcon icon={Edit} tooltip="Edit" onClick={() => openEdit(b)} />
                                            <ActionIcon icon={Trash2} tooltip="Hapus" variant="danger" onClick={() => setDeleteModal(b)} />
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create / Edit Drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />
                    <div className="relative ml-auto w-full max-w-2xl h-full bg-background shadow-2xl flex flex-col overflow-hidden">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {editing ? 'Edit Cabang' : 'Tambah Cabang Baru'}
                                </h2>
                                <p className="text-xs text-muted-foreground">Kelola informasi, legalitas, dan akta cabang</p>
                            </div>
                            <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">✕</button>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex border-b border-border">
                            {([
                                { id: 'basic', label: '🏢 Informasi Umum' },
                                { id: 'legal', label: '📋 Legalitas' },
                                { id: 'akta', label: '📜 Akta Pendirian' },
                            ] as const).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Tab: Basic */}
                            {activeTab === 'basic' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Cabang *</label>
                                            <input required value={form.code} onChange={e => f('code', e.target.value)} placeholder="BRANCH-001" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                                            <select value={form.status} onChange={e => f('status', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background">
                                                <option value="ACTIVE">Aktif</option>
                                                <option value="INACTIVE">Tidak Aktif</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Cabang *</label>
                                        <input required value={form.name} onChange={e => f('name', e.target.value)} placeholder="PT. Contoh — Cabang Surabaya" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Legal (Sesuai Akta)</label>
                                        <input value={form.legal_name} onChange={e => f('legal_name', e.target.value)} placeholder="PT. Contoh Jaya Abadi — Cabang Surabaya" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Perusahaan Induk</label>
                                        <select value={form.parent_company_id} onChange={e => f('parent_company_id', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background">
                                            <option value="">— Pilih Perusahaan Induk —</option>
                                            {companyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
                                        <textarea value={form.address} onChange={e => f('address', e.target.value)} rows={3} placeholder="Jl. Contoh No. 1, Surabaya" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Negara</label>
                                            <input value={form.country} onChange={e => f('country', e.target.value)} placeholder="Indonesia" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon</label>
                                            <input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+62 31 5678900" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                            <input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="surabaya@perusahaan.co.id" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                                            <input value={form.website} onChange={e => f('website', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Legal */}
                            {activeTab === 'legal' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">NPWP</label>
                                            <input value={form.tax_id} onChange={e => f('tax_id', e.target.value)} placeholder="00.000.000.0-000.000" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">No. Registrasi / NIB</label>
                                            <input value={form.registration_no} onChange={e => f('registration_no', e.target.value)} placeholder="1234567890123" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pendirian</label>
                                        <input type="date" value={form.incorporation_date} onChange={e => f('incorporation_date', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                    </div>
                                </div>
                            )}

                            {/* Tab: Akta */}
                            {activeTab === 'akta' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-200 pb-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        Akta Pendirian Cabang
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">No. Akta Pendirian</label>
                                            <input value={form.establishment_deed_no} onChange={e => f('establishment_deed_no', e.target.value)} placeholder="No. 01" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Akta</label>
                                            <input type="date" value={form.establishment_deed_date} onChange={e => f('establishment_deed_date', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Notaris</label>
                                        <input value={form.establishment_notary_name} onChange={e => f('establishment_notary_name', e.target.value)} placeholder="Contoh: Hendra Wijaya, S.H., M.Kn." className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. SK Pengesahan Kemenkumham</label>
                                        <input value={form.establishment_approval_no} onChange={e => f('establishment_approval_no', e.target.value)} placeholder="AHU-0012345.AH.01.01.Tahun 2010" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Drawer Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                            <Button variant="outline" onClick={closeDrawer}>Batal</Button>
                            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Cabang')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteModal && (
                <Modal open onClose={() => setDeleteModal(null)} title="Hapus Cabang">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Yakin ingin menghapus cabang <span className="font-semibold text-foreground">{deleteModal.name}</span>?
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>Batal</Button>
                            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteModal.id)} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
