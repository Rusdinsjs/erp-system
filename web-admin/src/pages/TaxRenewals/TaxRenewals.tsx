import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRenewalApi, type TaxRenewal } from '../../api/tax-renewals';
import { assetApi } from '../../api/assets';
import { uploadApi } from '../../api/upload';
import { Card, Button, Badge, Modal, NumberInput, Input, Textarea, Pagination, SearchInput, Select, TableSkeleton, DateInput } from '../../components/ui';
import { CheckCircle, Plus, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const Tabs = ({ tabs, activeTab, onChange }: { tabs: string[], activeTab: string, onChange: (t: string) => void }) => (
    <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
            <button
                key={tab}
                onClick={() => onChange(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
            >
                {tab}
            </button>
        ))}
    </div>
);

// ── Add New Renewal Modal ──────────────────────────────────────────────────────
const AddRenewalModal = ({
    isOpen,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { asset_id: string; document_type: string; current_expiry: string; notes?: string }) => void;
}) => {
    const [assetId, setAssetId] = useState('');
    const [docType, setDocType] = useState('STNK');
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');

    const { data: assetsResult } = useQuery({
        queryKey: ['assets-search-renewal', search],
        queryFn: () => assetApi.list({ query: search, page: 1, per_page: 20 }),
        enabled: isOpen,
    });

    const assetOptions = (assetsResult?.data || []).map((a: any) => ({
        value: a.id,
        label: `${a.asset_code} — ${a.name}`,
    }));

    const docTypeOptions = [
        { value: 'STNK', label: 'STNK (Surat Tanda Nomor Kendaraan)' },
        { value: 'TAX', label: 'TAX / Pajak Tahunan' },
        { value: 'KIR', label: 'KIR (Uji Kelayakan)' },
        { value: 'HEAVY_EQUIPMENT_TAX', label: 'Heavy Equipment Tax (Pajak Alat Berat)' },
        { value: 'LAPOR_TIBA', label: 'Lapor Tiba (Kendaraan Luar Daerah)' },
        { value: 'OTHER', label: 'Dokumen Lainnya' },
    ];

    const handleSubmit = () => {
        if (!assetId) { toast.error('Pilih aset terlebih dahulu'); return; }
        if (!expiryDate) { toast.error('Tanggal expiry harus diisi'); return; }
        onSubmit({
            asset_id: assetId,
            document_type: docType,
            current_expiry: dayjs(expiryDate).format('YYYY-MM-DD'),
            notes: notes || undefined,
        });
        // reset
        setAssetId(''); setDocType('STNK'); setExpiryDate(null); setNotes(''); setSearch('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Renewal Dokumen" size="lg">
            <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                    <strong>Info:</strong> Data renewal juga otomatis muncul ketika tanggal expiry kendaraan mendekati 30 hari. Form ini untuk input <em>manual</em> atau dokumen di luar kendaraan.
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Cari Aset <span className="text-red-400">*</span></label>
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Ketik nama/kode aset..."
                    />
                </div>

                <Select
                    label="Pilih Aset *"
                    value={assetId}
                    onChange={setAssetId}
                    options={assetOptions}
                    placeholder="Pilih aset..."
                    required
                />

                <Select
                    label="Jenis Dokumen *"
                    value={docType}
                    onChange={setDocType}
                    options={docTypeOptions}
                    required
                />

                <DateInput
                    label="Tanggal Expiry / Jatuh Tempo *"
                    value={expiryDate}
                    onChange={setExpiryDate}
                    required
                />

                <Textarea
                    label="Catatan (Opsional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Perpanjangan STNK tahunan kendaraan operasional..."
                    rows={3}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} leftIcon={<Plus size={16} />}>Tambah Renewal</Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Input Cost Modal ──────────────────────────────────────────────────────────
const InputCostModal = ({
    isOpen, onClose, renewal, onSubmit
}: {
    isOpen: boolean;
    onClose: () => void;
    renewal: TaxRenewal | null;
    onSubmit: (data: { cost: number; notes: string; destination: string; attachment?: string }) => void;
}) => {
    const [cost, setCost] = useState<number | undefined>(undefined);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [destination, setDestination] = useState('');
    const [customDestination, setCustomDestination] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);

    const destinations = [
        "Samsat (STNK/Pajak Tahunan)",
        "Dishub (KIR)",
        "Polres (Lapor Tiba)",
        "Dispenda Prov (Pajak Alat Berat)",
        "Kantor Pajak (Pajak)",
        "+ Tambah Lainnya...",
    ];

    const handleDestinationChange = (val: string) => {
        if (val === "+ Tambah Lainnya...") { setIsCustom(true); setDestination(""); }
        else { setIsCustom(false); setDestination(val); }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await uploadApi.upload(file);
            setAttachmentUrl(res.url);
            toast.success("File uploaded");
        } catch { toast.error("Upload gagal"); }
        finally { setIsUploading(false); }
    };

    const handleSubmit = () => {
        if (!cost || cost <= 0) { toast.error("Biaya harus lebih dari 0"); return; }
        const finalDest = isCustom ? customDestination : destination;
        if (!finalDest) { toast.error("Pilih tujuan pembayaran"); return; }
        const finalNotes = reference ? `[Ref: ${reference}] ${notes}` : notes;
        onSubmit({ cost, notes: finalNotes, destination: finalDest, attachment: attachmentUrl });
        onClose();
        setCost(undefined); setReference(''); setNotes(''); setDestination('');
        setCustomDestination(''); setIsCustom(false); setAttachmentUrl(undefined);
    };

    if (!renewal) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Input Biaya: ${renewal.document_type}`}>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Aset</label>
                    <div className="text-foreground font-medium">{renewal.asset_name || renewal.asset_id}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput label="Biaya Renewal (Rp) *" value={cost} onChange={setCost} placeholder="0" min={0} required />
                    <Input label="No. Referensi" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2024-001" />
                </div>
                <div>
                    <Select
                        label="Tujuan Pembayaran *"
                        value={isCustom ? "__CUSTOM__" : destination}
                        onChange={handleDestinationChange}
                        options={destinations.map(d => ({ value: d, label: d }))}
                        placeholder="Pilih tujuan..."
                        required
                        onCreate={() => setIsCustom(true)}
                    />
                </div>
                {isCustom && (
                    <Input label="Tujuan Lainnya" value={customDestination}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDestination(e.target.value)}
                        placeholder="Masukkan nama instansi..." autoFocus required />
                )}
                <Textarea label="Keterangan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." rows={3} />
                <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground block">Bukti Invoice / Tagihan</label>
                    <div className="flex items-center gap-3">
                        <input type="file" id="invoice-attachment" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
                        <Button variant="outline" onClick={() => document.getElementById('invoice-attachment')?.click()} disabled={isUploading}>
                            {isUploading ? "Uploading..." : attachmentUrl ? "Ganti File" : "Upload Bukti"}
                        </Button>
                        {attachmentUrl && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Siap</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Samsat, Dishub, dll (Max 10MB)</p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit}>Simpan</Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Complete Modal (replace browser prompt) ───────────────────────────────────
const CompleteModal = ({
    isOpen, onClose, renewal, onSubmit
}: {
    isOpen: boolean;
    onClose: () => void;
    renewal: TaxRenewal | null;
    onSubmit: (date: string) => void;
}) => {
    const defaultDate = renewal ? dayjs(renewal.current_expiry).add(1, 'year').toDate() : null;
    const [newExpiry, setNewExpiry] = useState<Date | null>(defaultDate);

    useEffect(() => {
        if (renewal) setNewExpiry(dayjs(renewal.current_expiry).add(1, 'year').toDate());
    }, [renewal]);

    if (!renewal) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selesaikan Renewal">
            <div className="space-y-4">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
                    Masukkan tanggal expiry baru setelah pembayaran selesai. Tanggal ini akan diperbarui di data aset.
                </div>
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Aset</label>
                    <div className="font-medium">{renewal.asset_name || renewal.asset_id} — <span className="text-cyan-400">{renewal.document_type}</span></div>
                </div>
                <DateInput label="Tanggal Expiry Baru *" value={newExpiry} onChange={setNewExpiry} required />
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={() => {
                        if (!newExpiry) { toast.error('Tanggal wajib diisi'); return; }
                        onSubmit(dayjs(newExpiry).format('YYYY-MM-DD'));
                        onClose();
                    }}>
                        Konfirmasi Selesai
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Upload Document Modal (Auto-open after complete) ──────────────────────────
const UploadRenewalDocumentModal = ({
    isOpen, onClose, assetId, initialType
}: {
    isOpen: boolean;
    onClose: () => void;
    assetId: string;
    initialType: string;
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState(initialType);
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setType(initialType);
            setName(`${initialType} Baru - ${dayjs().format('YYYY')}`);
        }
    }, [isOpen, initialType]);

    const handleUpload = async () => {
        if (!file) { toast.error("Pilih file terlebih dahulu"); return; }
        setIsUploading(true);
        try {
            const fileData = await assetApi.uploadFile(file);
            await assetApi.addDocument(assetId, {
                name: name || fileData.original_name,
                type: type,
                file_path: fileData.url,
                mime_type: fileData.content_type,
                size_bytes: fileData.size,
                notes: notes
            });
            toast.success("Dokumen berhasil diunggah");
            queryClient.invalidateQueries({ queryKey: ['asset-documents', assetId] });
            onClose();
        } catch (error) {
            toast.error("Gagal mengunggah dokumen");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Dokumen Baru">
            <div className="space-y-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300">
                    Satu langkah lagi! Silakan unggah hasil scan/foto dokumen terbaru untuk arsip digital aset ini.
                </div>
                <Input
                    label="File Dokumen *"
                    type="file"
                    onChange={(e: any) => setFile(e.target.files?.[0] || null)}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nama Dokumen"
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        placeholder="Contoh: STNK 2024-2025"
                    />
                    <Select
                        label="Tipe Dokumen"
                        value={type}
                        onChange={setType}
                        options={[
                            { value: 'STNK', label: 'STNK' },
                            { value: 'KIR', label: 'KIR' },
                            { value: 'TAX', label: 'TAX / Pajak' },
                            { value: 'INVOICE', label: 'Invoice' },
                            { value: 'OTHER', label: 'Lainnya' }
                        ]}
                    />
                </div>
                <Textarea
                    label="Catatan"
                    value={notes}
                    onChange={(e: any) => setNotes(e.target.value)}
                    placeholder="Contoh: Dokumen asli disimpan di brankas..."
                />
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Nanti Saja</Button>
                    <Button onClick={handleUpload} loading={isUploading} leftIcon={<Upload size={16} />}>
                        Simpan Dokumen
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaxRenewals() {
    const [activeTab, setActiveTab] = useState('Needs Attention');
    const queryClient = useQueryClient();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedRenewal, setSelectedRenewal] = useState<TaxRenewal | null>(null);
    const [targetAssetId, setTargetAssetId] = useState('');
    const [targetDocType, setTargetDocType] = useState('OTHER');

    const statusMap: Record<string, string | undefined> = {
        'Needs Attention': 'PENDING_INPUT',
        'Payment': 'INVOICED',
        'History': 'COMPLETED',
    };

    const { data: renewals, isLoading } = useQuery({
        queryKey: ['tax-renewals', activeTab],
        queryFn: () => taxRenewalApi.list(statusMap[activeTab]),
    });

    const createMutation = useMutation({
        mutationFn: taxRenewalApi.create,
        onSuccess: () => { toast.success('Renewal berhasil ditambahkan'); queryClient.invalidateQueries({ queryKey: ['tax-renewals'] }); },
        onError: () => toast.error('Gagal menambahkan renewal'),
    });

    const submitCostMutation = useMutation({
        mutationFn: ({ id, cost, notes, destination, attachment }: { id: string; cost: number; notes: string; destination: string; attachment?: string }) =>
            taxRenewalApi.submitCost(id, { renewal_cost: cost, notes, payment_destination: destination, invoice_attachment: attachment }),
        onSuccess: () => { toast.success('Biaya berhasil disimpan'); queryClient.invalidateQueries({ queryKey: ['tax-renewals'] }); },
    });

    const completeMutation = useMutation({
        mutationFn: ({ id, date }: { id: string; date: string }) =>
            taxRenewalApi.complete(id, { new_expiry_date: date }),
        onSuccess: (_, variables) => { 
            toast.success('Renewal selesai'); 
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
            
            // Auto-open upload modal
            if (selectedRenewal) {
                setTargetAssetId(selectedRenewal.asset_id);
                setTargetDocType(selectedRenewal.document_type);
                setIsUploadModalOpen(true);
            }
        },
    });

    const [filterType, setFilterType] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => { setCurrentPage(1); }, [activeTab, filterType, searchQuery]);

    const processedRenewals = (renewals || [])
        .filter(item => {
            if (filterType !== 'ALL' && item.document_type !== filterType) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return item.asset_name?.toLowerCase().includes(q) || item.asset_id.toLowerCase().includes(q) || item.document_type.toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            const da = new Date(a.current_expiry).getTime();
            const db = new Date(b.current_expiry).getTime();
            return sortOrder === 'asc' ? da - db : db - da;
        });

    const totalPages = Math.ceil(processedRenewals.length / itemsPerPage);
    const paginatedRenewals = processedRenewals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const docBadgeVariant = (type: string) => {
        if (type === 'STNK') return 'info';
        if (type === 'TAX') return 'warning';
        if (type === 'HEAVY_EQUIPMENT_TAX') return 'danger';
        return 'default';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tax & Document Renewals</h1>
                    <p className="text-muted-foreground">Kelola perpanjangan dokumen dan pajak kendaraan/aset.</p>
                </div>
                <Button leftIcon={<Plus size={18} />} onClick={() => setIsAddModalOpen(true)} className="rounded-xl shadow-lg shadow-cyan-500/20">
                    Tambah Renewal
                </Button>
            </div>

            <Card padding="lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
                    <Tabs tabs={['Needs Attention', 'Payment', 'History']} activeTab={activeTab} onChange={setActiveTab} />
                    <div className="flex gap-2 items-center">
                        <div className="w-56">
                            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cari aset, ID, tipe..." />
                        </div>
                        <select
                            className="bg-background border border-border rounded px-3 py-2 text-sm h-[40px]"
                            value={filterType} onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">Semua Dokumen</option>
                            <option value="STNK">STNK</option>
                            <option value="TAX">Pajak (TAX)</option>
                            <option value="KIR">KIR</option>
                            <option value="HEAVY_EQUIPMENT_TAX">Pajak Alat Berat</option>
                            <option value="LAPOR_TIBA">Lapor Tiba</option>
                            <option value="OTHER">Lainnya</option>
                        </select>
                        <button
                            className="flex items-center gap-1 bg-background border border-border rounded px-3 py-2 text-sm h-[40px] hover:bg-secondary/50"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            Expiry {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-4 px-2"><TableSkeleton rows={5} cols={7} /></div>
                ) : paginatedRenewals.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <FileText className="mx-auto mb-3 opacity-30" size={40} />
                        <p className="font-medium">Tidak ada data di bagian ini</p>
                        <p className="text-sm mt-1">Klik <strong>Tambah Renewal</strong> untuk input manual, atau sistem akan otomatis mendeteksi kendaraan yang mendekati expiry.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                    <tr>
                                        <th className="px-4 py-3">Aset</th>
                                        <th className="px-4 py-3">Dokumen</th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-foreground" onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}>
                                            Expiry {sortOrder === 'asc' ? '↑' : '↓'}
                                        </th>
                                        <th className="px-4 py-3">Biaya</th>
                                        <th className="px-4 py-3 text-center">Bukti</th>
                                        {activeTab === 'History' && <th className="px-4 py-3">Tgl Bayar</th>}
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRenewals.map((item) => (
                                        <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                                            <td className="px-4 py-3 font-medium">
                                                {item.asset_name || <span className="text-muted-foreground font-mono text-xs">{item.asset_id}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={docBadgeVariant(item.document_type)}>{item.document_type}</Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {dayjs(item.current_expiry).format('DD MMM YYYY')}
                                            </td>
                                            <td className="px-4 py-3 text-foreground">
                                                {item.renewal_cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.renewal_cost as any) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.invoice_attachment ? (
                                                    <a href={item.invoice_attachment} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline text-xs">Lihat</a>
                                                ) : '-'}
                                            </td>
                                            {activeTab === 'History' && (
                                                <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                                                    {item.payment_date ? dayjs(item.payment_date).format('DD MMM YYYY') : '-'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.status === 'PENDING_INPUT' ? 'bg-red-500/10 text-red-400' :
                                                    item.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/10 text-yellow-400' :
                                                        item.status === 'APPROVED' || item.status === 'INVOICED' ? 'bg-green-500/10 text-green-400' :
                                                            'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {item.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {activeTab === 'Needs Attention' && (
                                                    <Button size="sm" onClick={() => { setSelectedRenewal(item); setIsCostModalOpen(true); }}>
                                                        Input Biaya
                                                    </Button>
                                                )}
                                                {activeTab === 'Payment' && (
                                                    <Button size="sm" variant="outline" onClick={() => { setSelectedRenewal(item); setIsCompleteModalOpen(true); }}>
                                                        Selesai
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                            <div className="text-sm text-muted-foreground">
                                {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, processedRenewals.length)} dari {processedRenewals.length} data
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </>
                )}
            </Card>

            <AddRenewalModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={(data) => createMutation.mutate(data)}
            />
            <InputCostModal
                isOpen={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
                renewal={selectedRenewal}
                onSubmit={({ cost, notes, destination, attachment }) => {
                    if (selectedRenewal) submitCostMutation.mutate({ id: selectedRenewal.id, cost, notes, destination, attachment });
                }}
            />
            <CompleteModal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                renewal={selectedRenewal}
                onSubmit={(date) => { if (selectedRenewal) completeMutation.mutate({ id: selectedRenewal.id, date }); }}
            />
            <UploadRenewalDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                assetId={targetAssetId}
                initialType={targetDocType}
            />
        </div>
    );
}
