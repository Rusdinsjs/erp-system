import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRenewalApi, type TaxRenewal } from '../../api/tax-renewals';
import { uploadApi } from '../../api/upload';
import { Card, Button, Badge, Modal, NumberInput, Input, Textarea, Pagination, SearchInput, Select, TableSkeleton } from '../../components/ui';
import { CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

// Simple Tabs Component
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

// Input Cost Modal
const InputCostModal = ({
    isOpen,
    onClose,
    renewal,
    onSubmit
}: {
    isOpen: boolean;
    onClose: () => void;
    renewal: TaxRenewal | null;
    onSubmit: (data: { cost: number; notes: string, destination: string, attachment?: string }) => void;
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
        "+ Add Items ..."
    ];

    const handleDestinationChange = (val: string) => {
        if (val === "+ Add Items ...") {
            setIsCustom(true);
            setDestination("");
        } else {
            setIsCustom(false);
            setDestination(val);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await uploadApi.upload(file);
            setAttachmentUrl(res.url);
            toast.success("File uploaded successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = () => {
        if (cost === undefined || cost <= 0) {
            toast.error("Cost must be greater than 0");
            return;
        }

        const finalDestination = isCustom ? customDestination : destination;
        if (!finalDestination) {
            toast.error("Please select or enter a payment destination");
            return;
        }

        // Combine reference and notes
        const finalNotes = reference ? `[Ref: ${reference}] ${notes}` : notes;
        onSubmit({ cost, notes: finalNotes, destination: finalDestination, attachment: attachmentUrl });
        onClose();
        // Reset form
        setCost(undefined);
        setReference('');
        setNotes('');
        setDestination('');
        setCustomDestination('');
        setIsCustom(false);
        setAttachmentUrl(undefined);
    };

    if (!renewal) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Input Cost: ${renewal.document_type}`}>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">Asset</label>
                    <div className="text-foreground font-medium">{renewal.asset_name || renewal.asset_id}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput
                        label="Biaya Renewal (Cost)"
                        value={cost}
                        onChange={setCost}
                        placeholder="0"
                        min={0}
                        required
                    />

                    <Input
                        label="No. Referensi"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Contoh: INV-2024-001"
                    />
                </div>

                <div>
                    <Select
                        label="Tujuan Pembayaran"
                        value={isCustom ? "__CREATE_NEW__" : destination}
                        onChange={handleDestinationChange}
                        options={destinations.map(d => ({ value: d, label: d }))}
                        placeholder="Pilih Tujuan..."
                        required
                        onCreate={() => setIsCustom(true)}
                    />
                </div>

                {isCustom && (
                    <Input
                        label="Custom Tujuan Pembayaran"
                        value={customDestination}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDestination(e.target.value)}
                        placeholder="Masukkan nama instansi/tujuan..."
                        autoFocus
                        required
                    />
                )}

                <Textarea
                    label="Keterangan Lainnya"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={3}
                />

                <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground block">Bukti Invoice / Tagihan</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            id="invoice-attachment"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                        />
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById('invoice-attachment')?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? "Uploading..." : attachmentUrl ? "Change File" : "Upload Proof"}
                        </Button>
                        {attachmentUrl && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle size={12} /> File Ready
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Samsat, Pemda, Dishub, dll (Max 10MB)</p>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Submit</Button>
                </div>
            </div>
        </Modal>
    );
};

export default function TaxRenewals() {
    const [activeTab, setActiveTab] = useState('Needs Attention');
    const queryClient = useQueryClient();

    // Modal State
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [selectedRenewal, setSelectedRenewal] = useState<TaxRenewal | null>(null);

    // Fetch data based on active tab
    const statusMap: Record<string, string | undefined> = {
        'Needs Attention': 'PENDING_INPUT',
        'Payment': 'INVOICED',
        'History': 'COMPLETED'
    };

    const { data: renewals, isLoading } = useQuery({
        queryKey: ['tax-renewals', activeTab],
        queryFn: () => taxRenewalApi.list(statusMap[activeTab]),
    });

    // Mutations
    const submitCostMutation = useMutation({
        mutationFn: ({ id, cost, notes, destination, attachment }: { id: string, cost: number, notes: string, destination: string, attachment?: string }) =>
            taxRenewalApi.submitCost(id, { renewal_cost: cost, notes, payment_destination: destination, invoice_attachment: attachment }),
        onSuccess: () => {
            toast.success('Cost submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
        }
    });


    const completeMutation = useMutation({
        mutationFn: ({ id, date }: { id: string, date: string }) =>
            taxRenewalApi.complete(id, { new_expiry_date: date }),
        onSuccess: () => {
            toast.success('Renewal completed');
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
        }
    });

    // Handle Actions
    const handleInputCostClick = (renewal: TaxRenewal) => {
        setSelectedRenewal(renewal);
        setIsCostModalOpen(true);
    };

    const handleCostSubmit = ({ cost, notes, destination, attachment }: { cost: number; notes: string, destination: string, attachment?: string }) => {
        if (selectedRenewal) {
            submitCostMutation.mutate({ id: selectedRenewal.id, cost, notes, destination, attachment });
        }
    };

    const [filterType, setFilterType] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState(''); // New search state

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when tab, filter, or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filterType, searchQuery]);

    // Process data (Search, Filter & Sort)
    const processedRenewals = (renewals || [])
        .filter(item => {
            // Document Type Filter
            if (filterType !== 'ALL' && item.document_type !== filterType) return false;

            // Search Query Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const nameMatch = item.asset_name?.toLowerCase().includes(query);
                const idMatch = item.asset_id.toLowerCase().includes(query);
                const typeMatch = item.document_type.toLowerCase().includes(query);
                return nameMatch || idMatch || typeMatch;
            }
            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.current_expiry).getTime();
            const dateB = new Date(b.current_expiry).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

    // Pagination Logic
    const totalPages = Math.ceil(processedRenewals.length / itemsPerPage);
    const paginatedRenewals = processedRenewals.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tax & Document Renewals</h1>
                    <p className="text-muted-foreground">Manage vehicle document expirations and renewals.</p>
                </div>
            </div>

            <Card padding="lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <Tabs
                        tabs={['Needs Attention', 'Payment', 'History']}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    <div className="flex gap-2 items-center">
                        <div className="w-64">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search Asset, ID, Type..."
                            />
                        </div>

                        <select
                            className="bg-background border border-border rounded px-3 py-2 text-sm h-[40px]" // Fixed height to match search input
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Documents</option>
                            <option value="STNK">STNK</option>
                            <option value="TAX">Tax (Pajak)</option>
                            <option value="KIR">KIR</option>
                            <option value="HEAVY_EQUIPMENT_TAX">Heavy Equipment Tax</option>
                            <option value="LAPOR_TIBA">Lapor Tiba</option>
                        </select>

                        <button
                            className="flex items-center gap-1 bg-background border border-border rounded px-3 py-2 text-sm h-[40px] hover:bg-secondary/50"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        >
                            Sort Expiry {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-4 px-2"><TableSkeleton rows={5} cols={7} /></div>
                ) : !processedRenewals || processedRenewals.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                        No records found in this section.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                    <tr>
                                        <th className="px-4 py-3">Asset</th>
                                        <th className="px-4 py-3">Document</th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-foreground"
                                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        >
                                            Expiry {sortOrder === 'asc' ? '↑' : '↓'}
                                        </th>
                                        <th className="px-4 py-3">Cost</th>
                                        <th className="px-4 py-3 text-center">Proof</th>
                                        {activeTab === 'History' && <th className="px-4 py-3">Payment Date</th>}
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRenewals.map((item) => (
                                        <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                                            <td className="px-4 py-3 font-medium">
                                                {item.asset_name || <span className="text-muted-foreground font-mono text-xs">{item.asset_id}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={
                                                    item.document_type === 'STNK' ? 'info' :
                                                        item.document_type === 'TAX' ? 'warning' :
                                                            item.document_type === 'HEAVY_EQUIPMENT_TAX' ? 'danger' : 'default'
                                                }>
                                                    {item.document_type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {dayjs(item.current_expiry).format('DD MMM YYYY')}
                                            </td>
                                            <td className="px-4 py-3 text-foreground">
                                                {item.renewal_cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.renewal_cost) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.invoice_attachment ? (
                                                    <a
                                                        href={item.invoice_attachment}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-400 hover:text-cyan-300 underline text-xs"
                                                    >
                                                        View
                                                    </a>
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
                                                        item.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                                            'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {activeTab === 'Needs Attention' && (
                                                    <Button size="sm" onClick={() => handleInputCostClick(item)}>
                                                        Input Cost
                                                    </Button>
                                                )}
                                                {activeTab === 'Payment' && (
                                                    <Button size="sm" onClick={() => {
                                                        const date = prompt('Enter new expiry date (YYYY-MM-DD):', dayjs(item.current_expiry).add(1, 'year').format('YYYY-MM-DD'));
                                                        if (date) completeMutation.mutate({ id: item.id, date });
                                                    }}>
                                                        Complete
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
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedRenewals.length)} of {processedRenewals.length} entries
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </>
                )}
            </Card>

            <InputCostModal
                isOpen={isCostModalOpen}
                onClose={() => setIsCostModalOpen(false)}
                renewal={selectedRenewal}
                onSubmit={handleCostSubmit}
            />
        </div >
    );
}
