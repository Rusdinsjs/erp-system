import { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, Download, Play, ShieldCheck } from 'lucide-react';
import Papa from 'papaparse';
import { dataImportApi, type DataImport, type DataImportLog } from '../../api/dataImport';
import { Button, Card, Select, Badge, useToast, LoadingOverlay, Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../ui';

interface FrappeDataImportCenterProps {
    defaultDocType?: string;
    onImportFinished?: () => void;
}

export function FrappeDataImportCenter({ defaultDocType = 'Asset', onImportFinished }: FrappeDataImportCenterProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [docType, setDocType] = useState<string>(defaultDocType);
    const [importType, setImportType] = useState<'Insert' | 'Update'>('Insert');

    const [importRecord, setImportRecord] = useState<DataImport | null>(null);
    const [logs, setLogs] = useState<DataImportLog[]>([]);

    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [executing, setExecuting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error: showError } = useToast();

    const handleDownloadTemplate = async () => {
        setLoading(true);
        try {
            const blob = await dataImportApi.generateTemplate({
                doctype_name: docType,
                import_type: importType,
            });

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `template_${docType.toLowerCase()}_${importType.toLowerCase()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('Template CSV Frappe Standard berhasil diunduh', 'Sukses');
        } catch (err: any) {
            showError('Gagal mengunduh template CSV', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const payload = e.target.files?.[0] || null;
        if (!payload) return;

        Papa.parse(payload, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                setLoading(true);
                try {
                    const rec = await dataImportApi.uploadImport({
                        doctype_name: docType,
                        import_type: importType,
                        file_name: payload.name,
                        rows: results.data as Record<string, any>[],
                    });

                    setImportRecord(rec);
                    const detail = await dataImportApi.getImportDetail(rec.id);
                    setLogs(detail.logs);
                    setStep(2);
                    success(`Berhasil mengunggah ${results.data.length} baris data ke penampungan staging`, 'Sukses');
                } catch (err: any) {
                    showError(err.response?.data?.message || 'Gagal mengunggah file data import', 'Error');
                } finally {
                    setLoading(false);
                }
            },
            error: () => {
                showError('Gagal membaca format file CSV', 'Error');
            }
        });
    };

    const handleRunValidation = async () => {
        if (!importRecord) return;
        setValidating(true);
        try {
            const updated = await dataImportApi.validateImport(importRecord.id);
            setImportRecord(updated);
            const detail = await dataImportApi.getImportDetail(importRecord.id);
            setLogs(detail.logs);
            success('Simulasi validasi data selesai', 'Validasi OK');
        } catch (err: any) {
            showError('Gagal menjalankan validasi data', 'Error');
        } finally {
            setValidating(false);
        }
    };

    const handleExecuteImport = async () => {
        if (!importRecord) return;
        setExecuting(true);
        try {
            const updated = await dataImportApi.startImport(importRecord.id);
            setImportRecord(updated);
            const detail = await dataImportApi.getImportDetail(importRecord.id);
            setLogs(detail.logs);
            setStep(3);
            success(`Proses impor data selesai. Berhasil: ${updated.successful_rows}, Gagal: ${updated.failed_rows}`, 'Eksekusi Selesai');
            if (onImportFinished) onImportFinished();
        } catch (err: any) {
            showError('Gagal mengeksekusi impor data', 'Error');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <Card className="p-6 bg-card border-border shadow-xl space-y-6 relative overflow-hidden">
            <LoadingOverlay visible={loading || validating || executing} />

            {/* Stepper Header */}
            <div className="grid grid-cols-3 gap-2 border-b border-border pb-4">
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${step === 1 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">1</div>
                    <span className="text-sm">Template & Mode</span>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${step === 2 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">2</div>
                    <span className="text-sm">Dry-Run Validation</span>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${step === 3 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">3</div>
                    <span className="text-sm">Eksekusi & Audit Log</span>
                </div>
            </div>

            {/* STEP 1: TEMPLATE & UPLOAD */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                Target DocType
                            </label>
                            <Select
                                value={docType}
                                onChange={(val: string) => setDocType(val)}
                                options={[
                                    { value: 'Asset', label: 'DocType: Asset (Data Aset)' },
                                    { value: 'InventoryItem', label: 'DocType: InventoryItem (Data Barang)' },
                                    { value: 'WorkOrder', label: 'DocType: WorkOrder (Perintah Kerja)' }
                                ]}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                Mode Impor Data
                            </label>
                            <Select
                                value={importType}
                                onChange={(val: string) => setImportType(val as any)}
                                options={[
                                    { value: 'Insert', label: 'Insert New Records (Buat Data Baru)' },
                                    { value: 'Update', label: 'Update Existing Records (Perbarui Data Lama by Code)' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                        <div className="space-y-1">
                            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                <FileSpreadsheet className="text-cyan-400" size={18} />
                                Unduh Template CSV (Frappe Standard)
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Unduh struktur CSV sesuai mode <span className="font-bold text-cyan-400">{importType}</span> lengkap dengan metadata header dan kolom wajib.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleDownloadTemplate} leftIcon={<Download size={16} />}>
                            Unduh Template
                        </Button>
                    </div>

                    {/* Upload File Zone */}
                    <div className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/50 transition-colors">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button
                            variant="primary"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                            onClick={() => fileInputRef.current?.click()}
                            leftIcon={<Upload size={18} />}
                        >
                            Pilih File CSV Untuk Diimpor
                        </Button>
                        <p className="text-xs text-muted-foreground">File akan otomatis diunggah ke area penampungan staging untuk divalidasi</p>
                    </div>
                </div>
            )}

            {/* STEP 2: DRY-RUN VALIDATION TABLE */}
            {step === 2 && importRecord && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border">
                        <div>
                            <span className="text-xs text-muted-foreground block">Ringkasan Staging Impor:</span>
                            <span className="font-bold text-foreground text-lg">
                                {importRecord.file_name} ({importRecord.total_rows} Baris Data)
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleRunValidation}
                                loading={validating}
                                leftIcon={<ShieldCheck size={16} />}
                            >
                                Jalankan Simulasi Validasi (Dry-Run)
                            </Button>

                            <Button
                                variant="primary"
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                                onClick={handleExecuteImport}
                                loading={executing}
                                disabled={importRecord.status === 'Pending'}
                                leftIcon={<Play size={16} />}
                            >
                                Eksekusi Impor Data
                            </Button>
                        </div>
                    </div>

                    {/* Validation Table */}
                    <div className="max-h-[400px] overflow-auto border border-border rounded-xl">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh className="w-16">Baris</TableTh>
                                    <TableTh>Identifier (Kode)</TableTh>
                                    <TableTh>Status Validasi</TableTh>
                                    <TableTh>Pesan / Alasan Error</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.map((log) => {
                                    const msgs: string[] = Array.isArray(log.messages) ? log.messages : [];
                                    return (
                                        <TableRow key={log.id}>
                                            <TableTd className="font-mono text-xs">{log.row_number}</TableTd>
                                            <TableTd className="font-semibold">{log.record_identifier || '-'}</TableTd>
                                            <TableTd>
                                                <Badge variant={log.status === 'Success' ? 'success' : log.status === 'Failed' ? 'danger' : 'default'}>
                                                    {log.status}
                                                </Badge>
                                            </TableTd>
                                            <TableTd className="text-xs text-rose-400">
                                                {msgs.length > 0 ? msgs.join(' | ') : <span className="text-emerald-400">Valid</span>}
                                            </TableTd>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* STEP 3: RESULT & AUDIT LOG */}
            {step === 3 && importRecord && (
                <div className="space-y-6 text-center py-6">
                    <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-2">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">Proses Impor Data Selesai</h3>
                    <p className="text-sm text-muted-foreground">
                        Hasil impor untuk file <span className="font-bold text-foreground">{importRecord.file_name}</span>:
                    </p>

                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                        <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                            <span className="text-xs text-muted-foreground block">Total Baris</span>
                            <span className="text-2xl font-bold text-foreground">{importRecord.total_rows}</span>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <span className="text-xs text-emerald-400 block">Berhasil</span>
                            <span className="text-2xl font-bold text-emerald-400">{importRecord.successful_rows}</span>
                        </div>
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                            <span className="text-xs text-rose-400 block">Gagal</span>
                            <span className="text-2xl font-bold text-rose-400">{importRecord.failed_rows}</span>
                        </div>
                    </div>

                    <div className="flex justify-center gap-3 pt-4">
                        {importRecord.failed_rows > 0 && (
                            <a
                                href={dataImportApi.getFailedRowsUrl(importRecord.id)}
                                download
                                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors"
                            >
                                <Download size={16} />
                                Download Failed Rows CSV
                            </a>
                        )}

                        <Button variant="outline" onClick={() => setStep(1)}>
                            Impor File Lain
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
