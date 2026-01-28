// RetiredModal - Form for retiring an asset
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { lifecycleApi } from '../../api/lifecycle';
import {
    Modal,
    Button,
    Textarea,
    Input,
    Select,
    useToast,
} from '../ui';

interface RetiredModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess?: () => void;
}

const retirementReasons = [
    { value: 'end_of_life', label: 'Akhir Masa Pakai (End of Life)' },
    { value: 'obsolete', label: 'Usang / Obsolete' },
    { value: 'no_longer_needed', label: 'Tidak Diperlukan Lagi' },
    { value: 'replaced', label: 'Digantikan Aset Baru' },
    { value: 'damaged_beyond_repair', label: 'Rusak Tidak Dapat Diperbaiki' },
    { value: 'other', label: 'Lainnya' },
];

export function RetiredModal({ opened, onClose, assetId, onSuccess }: RetiredModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();

    const [formData, setFormData] = useState({
        reason: '',
        retirement_date: new Date().toISOString().split('T')[0],
        residual_value: '',
        notes: '',
        replacement_asset_id: '',
    });

    const mutation = useMutation({
        mutationFn: () => lifecycleApi.requestTransition(assetId, 'retired',
            `Alasan: ${retirementReasons.find(r => r.value === formData.reason)?.label || formData.reason}\n` +
            `Tanggal Pengakhiran: ${formData.retirement_date}\n` +
            `Nilai Residu: Rp ${formData.residual_value || '0'}\n` +
            `Catatan: ${formData.notes}`
        ),
        onSuccess: (response) => {
            if (response.result_type === 'Executed') {
                success('Asset telah di-retired', 'Success');
            } else {
                info('Permintaan retirement membutuhkan persetujuan Manager', 'Menunggu Approval');
            }
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            onClose();
            onSuccess?.();
        },
        onError: (err: any) => showError(err.message || 'Gagal submit', 'Error'),
    });

    const handleSubmit = () => {
        if (!formData.reason) {
            showError('Pilih alasan retirement', 'Validasi');
            return;
        }
        mutation.mutate();
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="Retire Asset" size="md">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <Archive size={24} className="text-orange-500" />
                    <div>
                        <p className="text-orange-500 font-medium">Perhatian</p>
                        <p className="text-sm text-muted-foreground">Asset yang di-retire tidak akan aktif lagi dan membutuhkan persetujuan Manager.</p>
                    </div>
                </div>

                <Select
                    label="Alasan Retirement *"
                    value={formData.reason}
                    onChange={(value) => setFormData({ ...formData, reason: value })}
                    options={retirementReasons}
                    placeholder="Pilih alasan..."
                />

                <Input
                    label="Tanggal Pengakhiran"
                    type="date"
                    value={formData.retirement_date}
                    onChange={(e) => setFormData({ ...formData, retirement_date: e.target.value })}
                />

                <Input
                    label="Nilai Residu (Rp)"
                    type="number"
                    placeholder="0"
                    value={formData.residual_value}
                    onChange={(e) => setFormData({ ...formData, residual_value: e.target.value })}
                />

                <Textarea
                    label="Catatan Tambahan"
                    placeholder="Kondisi akhir aset, lokasi penyimpanan, dll..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={handleSubmit} loading={mutation.isPending}>
                        Submit Retirement
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
