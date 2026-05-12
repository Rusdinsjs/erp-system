// LostStolenModal - Form for reporting lost or stolen asset
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { lifecycleApi } from '../../api/lifecycle';
import {
    Modal,
    Button,
    Textarea,
    Input,
    Select,
    useToast,
} from '../ui';

interface LostStolenModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess?: () => void;
}

const incidentTypes = [
    { value: 'lost', label: 'Hilang' },
    { value: 'stolen', label: 'Dicuri' },
    { value: 'missing', label: 'Tidak Ditemukan (Audit)' },
];

export function LostStolenModal({ opened, onClose, assetId, onSuccess }: LostStolenModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();

    const [formData, setFormData] = useState({
        incident_type: '',
        incident_date: new Date().toISOString().split('T')[0],
        last_known_location: '',
        police_report_number: '',
        police_report_date: '',
        estimated_loss: '',
        description: '',
        witness_name: '',
    });

    const mutation = useMutation({
        mutationFn: () => lifecycleApi.requestTransition(assetId, 'lost_stolen',
            `Jenis Insiden: ${incidentTypes.find(t => t.value === formData.incident_type)?.label || formData.incident_type}\n` +
            `Tanggal Kejadian: ${formData.incident_date}\n` +
            `Lokasi Terakhir: ${formData.last_known_location || '-'}\n` +
            `No. Laporan Polisi: ${formData.police_report_number || 'Belum ada'}\n` +
            `Tanggal Laporan: ${formData.police_report_date || '-'}\n` +
            `Estimasi Kerugian: Rp ${formData.estimated_loss || '0'}\n` +
            `Saksi: ${formData.witness_name || '-'}\n` +
            `Kronologi: ${formData.description}`
        ),
        onSuccess: (response) => {
            if (response.result_type === 'Executed') {
                success('Laporan kehilangan telah dicatat', 'Success');
            } else {
                info('Laporan kehilangan membutuhkan persetujuan Manager', 'Menunggu Approval');
            }
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            onClose();
            onSuccess?.();
        },
        onError: (err: any) => showError(err.message || 'Gagal submit', 'Error'),
    });

    const handleSubmit = () => {
        if (!formData.incident_type) {
            showError('Pilih jenis insiden', 'Validasi');
            return;
        }
        if (!formData.description) {
            showError('Isi kronologi kejadian', 'Validasi');
            return;
        }
        mutation.mutate();
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="Lapor Kehilangan / Pencurian" size="lg">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <AlertTriangle size={24} className="text-destructive" />
                    <div>
                        <p className="text-destructive font-medium">Laporan Insiden</p>
                        <p className="text-sm text-muted-foreground">Harap lengkapi informasi dengan akurat. Laporan ini membutuhkan persetujuan Manager.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Jenis Insiden *"
                        value={formData.incident_type}
                        onChange={(value) => setFormData({ ...formData, incident_type: value })}
                        options={incidentTypes}
                        placeholder="Pilih jenis..."
                    />
                    <Input
                        label="Tanggal Kejadian *"
                        type="date"
                        value={formData.incident_date}
                        onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    />
                </div>

                <Input
                    label="Lokasi Terakhir Diketahui"
                    placeholder="Ruang server lantai 2, Gedung A"
                    value={formData.last_known_location}
                    onChange={(e) => setFormData({ ...formData, last_known_location: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="No. Laporan Polisi"
                        placeholder="LP/B/123/I/2026/POLRES"
                        value={formData.police_report_number}
                        onChange={(e) => setFormData({ ...formData, police_report_number: e.target.value })}
                    />
                    <Input
                        label="Tanggal Laporan Polisi"
                        type="date"
                        value={formData.police_report_date}
                        onChange={(e) => setFormData({ ...formData, police_report_date: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Estimasi Kerugian (Rp)"
                        type="number"
                        placeholder="0"
                        value={formData.estimated_loss}
                        onChange={(e) => setFormData({ ...formData, estimated_loss: e.target.value })}
                    />
                    <Input
                        label="Nama Saksi"
                        placeholder="Nama saksi jika ada"
                        value={formData.witness_name}
                        onChange={(e) => setFormData({ ...formData, witness_name: e.target.value })}
                    />
                </div>

                <Textarea
                    label="Kronologi Kejadian *"
                    placeholder="Jelaskan secara detail bagaimana dan kapan aset hilang/dicuri..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button variant="danger" onClick={handleSubmit} loading={mutation.isPending}>
                        Submit Laporan
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
