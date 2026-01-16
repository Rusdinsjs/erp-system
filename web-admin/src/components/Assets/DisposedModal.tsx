// DisposedModal - Form for disposing an asset
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { lifecycleApi } from '../../api/lifecycle';
import {
    Modal,
    Button,
    Textarea,
    Input,
    Select,
    useToast,
} from '../ui';

interface DisposedModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess?: () => void;
}

const disposalMethods = [
    { value: 'sold', label: 'Dijual' },
    { value: 'donated', label: 'Dihibahkan / Donasi' },
    { value: 'scrapped', label: 'Dibuang / Scrapped' },
    { value: 'traded_in', label: 'Tukar Tambah (Trade-In)' },
    { value: 'auction', label: 'Lelang' },
    { value: 'returned', label: 'Dikembalikan ke Vendor' },
    { value: 'destroyed', label: 'Dimusnahkan' },
];

export function DisposedModal({ opened, onClose, assetId, onSuccess }: DisposedModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();

    const [formData, setFormData] = useState({
        method: '',
        disposal_date: new Date().toISOString().split('T')[0],
        sale_value: '',
        buyer_name: '',
        document_number: '', // Nomor Berita Acara
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: () => lifecycleApi.requestTransition(assetId, 'disposed',
            `Metode Disposal: ${disposalMethods.find(m => m.value === formData.method)?.label || formData.method}\n` +
            `Tanggal Disposal: ${formData.disposal_date}\n` +
            `Nilai Penjualan: Rp ${formData.sale_value || '0'}\n` +
            `Pembeli/Penerima: ${formData.buyer_name || '-'}\n` +
            `No. Berita Acara: ${formData.document_number || '-'}\n` +
            `Catatan: ${formData.notes}`
        ),
        onSuccess: (response) => {
            if (response.result_type === 'Executed') {
                success('Asset telah di-dispose', 'Success');
            } else {
                info('Permintaan disposal membutuhkan persetujuan Manager', 'Menunggu Approval');
            }
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            onClose();
            onSuccess?.();
        },
        onError: (err: any) => showError(err.message || 'Gagal submit', 'Error'),
    });

    const handleSubmit = () => {
        if (!formData.method) {
            showError('Pilih metode disposal', 'Validasi');
            return;
        }
        mutation.mutate();
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="Dispose Asset" size="md">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <Trash2 size={24} className="text-red-400" />
                    <div>
                        <p className="text-red-400 font-medium">Tindakan Permanen</p>
                        <p className="text-sm text-slate-400">Asset yang di-dispose akan dihapus dari inventaris aktif. Membutuhkan persetujuan Manager.</p>
                    </div>
                </div>

                <Select
                    label="Metode Disposal *"
                    value={formData.method}
                    onChange={(value) => setFormData({ ...formData, method: value })}
                    options={disposalMethods}
                    placeholder="Pilih metode..."
                />

                <Input
                    label="Tanggal Disposal"
                    type="date"
                    value={formData.disposal_date}
                    onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nilai Penjualan (Rp)"
                        type="number"
                        placeholder="0"
                        value={formData.sale_value}
                        onChange={(e) => setFormData({ ...formData, sale_value: e.target.value })}
                    />
                    <Input
                        label="No. Berita Acara"
                        placeholder="BA-2026-001"
                        value={formData.document_number}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    />
                </div>

                <Input
                    label="Nama Pembeli / Penerima"
                    placeholder="PT. Contoh atau Yayasan ABC"
                    value={formData.buyer_name}
                    onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                />

                <Textarea
                    label="Catatan Tambahan"
                    placeholder="Detail kondisi akhir, alasan disposal, dll..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button variant="danger" onClick={handleSubmit} loading={mutation.isPending}>
                        Submit Disposal
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
