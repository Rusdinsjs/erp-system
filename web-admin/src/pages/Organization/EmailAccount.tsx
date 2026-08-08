// Email Account — Configure SMTP / IMAP accounts for outgoing and incoming mail
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, RefreshCw, Mail, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../api/http';
import {
    Button, Card, Modal, useToast,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge, ActionIcon,
} from '../../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EmailAccount {
    id: string;
    name: string;
    email_address: string;
    service_type?: string; // gmail | outlook | custom
    // SMTP
    smtp_host?: string;
    smtp_port?: number;
    smtp_use_ssl?: boolean;
    smtp_username?: string;
    // IMAP
    imap_host?: string;
    imap_port?: number;
    imap_use_ssl?: boolean;
    // Auth
    default_sender_name?: string;
    is_default?: boolean;
    is_active?: boolean;
    connected?: boolean;
    created_at: string;
    updated_at: string;
}

type EmailAccountPayload = Omit<EmailAccount, 'id' | 'created_at' | 'updated_at' | 'connected'> & {
    smtp_password?: string;
    imap_password?: string;
};

const EMPTY_FORM: EmailAccountPayload = {
    name: '',
    email_address: '',
    service_type: 'custom',
    default_sender_name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_use_ssl: false,
    smtp_username: '',
    smtp_password: '',
    imap_host: '',
    imap_port: 993,
    imap_use_ssl: true,
    imap_password: '',
    is_default: false,
    is_active: true,
};

const SERVICE_PRESETS: Record<string, Partial<EmailAccountPayload>> = {
    gmail: { smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_use_ssl: false, imap_host: 'imap.gmail.com', imap_port: 993, imap_use_ssl: true },
    outlook: { smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_use_ssl: false, imap_host: 'outlook.office365.com', imap_port: 993, imap_use_ssl: true },
    custom: {},
};

const emailAccountApi = {
    list: async () => { const r = await api.get('/email-accounts'); return r.data; },
    create: async (p: EmailAccountPayload) => { const r = await api.post('/email-accounts', p); return r.data; },
    update: async (id: string, p: EmailAccountPayload) => { const r = await api.put(`/email-accounts/${id}`, p); return r.data; },
    delete: async (id: string) => { const r = await api.delete(`/email-accounts/${id}`); return r.data; },
    test: async (id: string) => { const r = await api.post(`/email-accounts/${id}/test`); return r.data; },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmailAccount() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<EmailAccount | null>(null);
    const [editing, setEditing] = useState<EmailAccount | null>(null);
    const [form, setForm] = useState<EmailAccountPayload>(EMPTY_FORM);
    const [showSmtpPwd, setShowSmtpPwd] = useState(false);
    const [showImapPwd, setShowImapPwd] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['email-accounts'],
        queryFn: emailAccountApi.list,
        staleTime: 30_000,
    });

    const saveMutation = useMutation({
        mutationFn: (data: EmailAccountPayload) =>
            editing ? emailAccountApi.update(editing.id, data) : emailAccountApi.create(data),
        onSuccess: () => {
            success(editing ? 'Email account diperbarui' : 'Email account ditambahkan', 'Berhasil');
            queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
            closeDrawer();
        },
        onError: (err: any) => showError(err?.message || 'Terjadi kesalahan', 'Error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => emailAccountApi.delete(id),
        onSuccess: () => { success('Email account dihapus', 'Berhasil'); queryClient.invalidateQueries({ queryKey: ['email-accounts'] }); setDeleteModal(null); },
        onError: (err: any) => showError(err?.message || 'Gagal menghapus', 'Error'),
    });

    const handleTest = async (id: string) => {
        setTestingId(id);
        try {
            await emailAccountApi.test(id);
            success('Koneksi berhasil!', 'Test Email');
            queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
        } catch {
            showError('Koneksi gagal. Periksa kembali konfigurasi.', 'Test Email');
        } finally { setTestingId(null); }
    };

    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };
    const openEdit = (a: EmailAccount) => {
        setEditing(a);
        setForm({ name: a.name, email_address: a.email_address, service_type: a.service_type || 'custom', default_sender_name: a.default_sender_name || '', smtp_host: a.smtp_host || '', smtp_port: a.smtp_port || 587, smtp_use_ssl: a.smtp_use_ssl ?? false, smtp_username: a.smtp_username || '', smtp_password: '', imap_host: a.imap_host || '', imap_port: a.imap_port || 993, imap_use_ssl: a.imap_use_ssl ?? true, imap_password: '', is_default: a.is_default ?? false, is_active: a.is_active ?? true });
        setDrawerOpen(true);
    };
    const closeDrawer = () => { setDrawerOpen(false); setEditing(null); };
    const f = (key: keyof EmailAccountPayload, val: any) => setForm(p => ({ ...p, [key]: val }));
    const applyPreset = (type: string) => {
        const preset = SERVICE_PRESETS[type] || {};
        setForm(p => ({ ...p, service_type: type, ...preset }));
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Mail className="w-7 h-7 text-blue-600" />
                        Email Accounts
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Kelola akun email untuk pengiriman notifikasi dan korespondensi sistem
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['email-accounts'] })}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah Email Account
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Nama Akun</TableTh>
                            <TableTh>Alamat Email</TableTh>
                            <TableTh>SMTP</TableTh>
                            <TableTh>IMAP</TableTh>
                            <TableTh>Koneksi</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Aksi</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableTd colSpan={7} className="text-center py-12 text-muted-foreground">Memuat data...</TableTd>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableEmpty colSpan={7} message="Belum ada email account. Klik 'Tambah Email Account' untuk memulai." />
                        ) : (
                            accounts.map((a: EmailAccount) => (
                                <TableRow key={a.id}>
                                    <TableTd>
                                        <div className="font-medium text-foreground">{a.name}</div>
                                        {a.default_sender_name && <div className="text-xs text-muted-foreground">{a.default_sender_name}</div>}
                                        {a.is_default && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Default</span>}
                                    </TableTd>
                                    <TableTd className="text-sm font-mono">{a.email_address}</TableTd>
                                    <TableTd className="text-xs text-muted-foreground">
                                        {a.smtp_host ? `${a.smtp_host}:${a.smtp_port}` : '—'}
                                    </TableTd>
                                    <TableTd className="text-xs text-muted-foreground">
                                        {a.imap_host ? `${a.imap_host}:${a.imap_port}` : '—'}
                                    </TableTd>
                                    <TableTd>
                                        {a.connected === true ? (
                                            <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Terhubung</span>
                                        ) : a.connected === false ? (
                                            <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Gagal</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Belum diuji</span>
                                        )}
                                    </TableTd>
                                    <TableTd>
                                        <StatusBadge status={a.is_active ? 'active' : 'inactive'}>
                                            {a.is_active ? 'Aktif' : 'Nonaktif'}
                                        </StatusBadge>
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleTest(a.id)}
                                                disabled={testingId === a.id}
                                                className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                title="Test koneksi"
                                            >
                                                {testingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
                                            </button>
                                            <ActionIcon icon={Edit} tooltip="Edit" onClick={() => openEdit(a)} />
                                            <ActionIcon icon={Trash2} tooltip="Hapus" variant="danger" onClick={() => setDeleteModal(a)} />
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
                    <div className="relative ml-auto w-full max-w-xl h-full bg-background shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">{editing ? 'Edit Email Account' : 'Tambah Email Account'}</h2>
                                <p className="text-xs text-muted-foreground">Konfigurasi SMTP/IMAP untuk pengiriman email</p>
                            </div>
                            <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">✕</button>
                        </div>

                        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Service Type */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2">Jenis Layanan</label>
                                <div className="flex gap-2">
                                    {['gmail', 'outlook', 'custom'].map(t => (
                                        <button key={t} type="button" onClick={() => applyPreset(t)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${form.service_type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-background border-border text-muted-foreground hover:border-blue-400'}`}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun *</label>
                                    <input required value={form.name} onChange={e => f('name', e.target.value)} placeholder="Email Notifikasi" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pengirim</label>
                                    <input value={form.default_sender_name} onChange={e => f('default_sender_name', e.target.value)} placeholder="ERP System" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Email *</label>
                                <input required type="email" value={form.email_address} onChange={e => f('email_address', e.target.value)} placeholder="noreply@perusahaan.co.id" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                            </div>

                            {/* SMTP */}
                            <div className="border border-border rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">SMTP (Keluar)</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-[11px] text-slate-600 mb-1">Host</label>
                                        <input value={form.smtp_host} onChange={e => f('smtp_host', e.target.value)} placeholder="smtp.gmail.com" className="w-full px-2.5 py-1.5 border border-border rounded text-xs bg-background" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-600 mb-1">Port</label>
                                        <input type="number" value={form.smtp_port} onChange={e => f('smtp_port', Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-border rounded text-xs bg-background" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-600 mb-1">Username</label>
                                    <input value={form.smtp_username} onChange={e => f('smtp_username', e.target.value)} placeholder="user@gmail.com" className="w-full px-2.5 py-1.5 border border-border rounded text-xs bg-background" />
                                </div>
                                <div className="relative">
                                    <label className="block text-[11px] text-slate-600 mb-1">Password / App Password</label>
                                    <input type={showSmtpPwd ? 'text' : 'password'} value={form.smtp_password} onChange={e => f('smtp_password', e.target.value)} placeholder={editing ? '(tidak diubah)' : 'App password...'} className="w-full px-2.5 py-1.5 pr-9 border border-border rounded text-xs bg-background" />
                                    <button type="button" onClick={() => setShowSmtpPwd(p => !p)} className="absolute right-2 top-[22px] text-muted-foreground">
                                        {showSmtpPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <label className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={form.smtp_use_ssl} onChange={e => f('smtp_use_ssl', e.target.checked)} className="rounded" />
                                    Gunakan SSL/TLS
                                </label>
                            </div>

                            {/* IMAP */}
                            <div className="border border-border rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">IMAP (Masuk)</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-[11px] text-slate-600 mb-1">Host</label>
                                        <input value={form.imap_host} onChange={e => f('imap_host', e.target.value)} placeholder="imap.gmail.com" className="w-full px-2.5 py-1.5 border border-border rounded text-xs bg-background" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-600 mb-1">Port</label>
                                        <input type="number" value={form.imap_port} onChange={e => f('imap_port', Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-border rounded text-xs bg-background" />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-[11px] text-slate-600 mb-1">Password</label>
                                    <input type={showImapPwd ? 'text' : 'password'} value={form.imap_password} onChange={e => f('imap_password', e.target.value)} placeholder={editing ? '(tidak diubah)' : 'Password...'} className="w-full px-2.5 py-1.5 pr-9 border border-border rounded text-xs bg-background" />
                                    <button type="button" onClick={() => setShowImapPwd(p => !p)} className="absolute right-2 top-[22px] text-muted-foreground">
                                        {showImapPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <label className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={form.imap_use_ssl} onChange={e => f('imap_use_ssl', e.target.checked)} className="rounded" />
                                    Gunakan SSL/TLS
                                </label>
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} className="rounded" />
                                    Aktif
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={form.is_default} onChange={e => f('is_default', e.target.checked)} className="rounded" />
                                    Jadikan Default
                                </label>
                            </div>
                        </form>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                            <Button variant="outline" onClick={closeDrawer}>Batal</Button>
                            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Akun')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal && (
                <Modal open onClose={() => setDeleteModal(null)} title="Hapus Email Account">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Yakin ingin menghapus akun <span className="font-semibold text-foreground">{deleteModal.name}</span> ({deleteModal.email_address})?
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
