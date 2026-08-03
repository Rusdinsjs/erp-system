// ImportAssetsModal - Pure Tailwind
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Trash, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../../api/http';
import { Modal, Button, Table, TableHead, TableBody, TableRow, TableTh, TableTd, Badge, useToast, Select } from '../ui';

// Shared Attribute Templates are now fetched from the backend


interface ImportAssetsModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: any[];
    locations: any[];
}

const HEADER_ALIASES: Record<string, string> = {
    asset_code: 'asset_code',
    kode_aset: 'asset_code',
    kode: 'asset_code',
    code: 'asset_code',
    name: 'name',
    nama_aset: 'name',
    nama: 'name',
    asset_name: 'name',
    category: 'category',
    kategori: 'category',
    category_code: 'category',
    kode_kategori: 'category',
    location: 'location',
    lokasi: 'location',
    location_code: 'location',
    kode_lokasi: 'location',
    brand: 'brand',
    merek: 'brand',
    merk: 'brand',
    model: 'model',
    tipe: 'model',
    serial_number: 'serial_number',
    nomor_seri: 'serial_number',
    no_seri: 'serial_number',
    sn: 'serial_number',
    purchase_price: 'purchase_price',
    harga_beli: 'purchase_price',
    harga: 'purchase_price',
    status: 'status',
    kondisi: 'status',
    is_rental: 'is_rental',
    disewakan: 'is_rental',
};

const normalizeHeaderKey = (rawKey: string): string => {
    const clean = rawKey.toLowerCase().trim().replace(/[\s_\-]+/g, '_');
    return HEADER_ALIASES[clean] || clean;
};

export function ImportAssetsModal({ opened, onClose, onSuccess, categories, locations }: ImportAssetsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error: showError } = useToast();

    // Helpers to find IDs by name or code
    const findCategoryId = (nameOrCode: string) => {
        if (!nameOrCode) return null;
        const query = nameOrCode.toLowerCase().trim();
        const cat = categories.find((c: any) =>
            c.name.toLowerCase() === query ||
            c.code.toLowerCase() === query
        );
        return cat?.id;
    };

    const findLocationId = (nameOrCode: string) => {
        if (!nameOrCode) return null;
        const query = nameOrCode.toLowerCase().trim();
        const loc = locations.find((l: any) =>
            l.name.toLowerCase() === query ||
            l.code.toLowerCase() === query
        );
        return loc?.id;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const payload = e.target.files?.[0] || null;
        setFile(payload);

        if (payload) {
            Papa.parse(payload, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const processed = results.data.map((rawRow: any) => {
                        // Normalize headers dynamically (Bahasa Indonesia & English)
                        const row: Record<string, any> = {};
                        Object.keys(rawRow).forEach(k => {
                            const normalizedKey = normalizeHeaderKey(k);
                            row[normalizedKey] = rawRow[k];
                        });

                        const fallbackCat = selectedCategoryId ? categories.find((c: any) => c.id === selectedCategoryId) : null;
                        const categoryId = findCategoryId(row.category || '') || (selectedCategoryId || null);
                        const categoryDisplayName = row.category || fallbackCat?.name || fallbackCat?.code || '';

                        const locationId = findLocationId(row.location || '');

                        const knownFields = ['asset_code', 'name', 'category', 'location', 'brand', 'model', 'serial_number', 'purchase_price', 'status', 'is_rental'];
                        const specifications: Record<string, any> = {};

                        Object.keys(row).forEach(key => {
                            if (!knownFields.includes(key) && row[key]) {
                                const cleanKey = key.startsWith('spec_') ? key.replace('spec_', '') : key;
                                specifications[cleanKey] = row[key];
                            }
                        });

                        const assetCode = row.asset_code?.toString().trim();
                        const assetName = row.name?.toString().trim();

                        return {
                            ...row,
                            asset_code: assetCode,
                            name: assetName,
                            category_display: categoryDisplayName,
                            _categoryId: categoryId,
                            _locationId: locationId,
                            _specifications: specifications,
                            _isValid: !!assetCode && !!assetName && !!categoryId
                        };
                    });
                    setPreviewData(processed);
                },
                error: (err) => {
                    console.error('CSV Parse Error:', err);
                    showError('Gagal membaca file CSV', 'Error');
                }
            });
        } else {
            setPreviewData([]);
        }
    };

    const handleImport = async () => {
        const validRows = previewData.filter(r => r._isValid);
        if (validRows.length === 0) return;

        setLoading(true);
        try {
            const assets = validRows.map(row => {
                let statusVal = row.status?.toString().toLowerCase().trim() || 'in_inventory';
                if (statusVal === 'aktif' || statusVal === 'active') statusVal = 'in_use';
                if (statusVal === 'stok' || statusVal === 'siap gunakan') statusVal = 'in_inventory';

                return {
                    asset_code: row.asset_code,
                    name: row.name,
                    category_id: row._categoryId,
                    location_id: row._locationId || null,
                    brand: row.brand || null,
                    model: row.model || null,
                    serial_number: row.serial_number || null,
                    purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
                    status: statusVal,
                    is_rental: row.is_rental === 'true' || row.is_rental === '1' || row.is_rental === 'ya',
                    specifications: Object.keys(row._specifications || {}).length > 0 ? row._specifications : undefined
                };
            });

            await api.post('/assets/bulk', { assets });

            success(`Berhasil mengimpor ${assets.length} data aset`, 'Sukses');
            onSuccess();
            handleClose();
        } catch (err: any) {
            showError(err.response?.data?.message || 'Gagal mengimpor aset', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const downloadTemplate = () => {
        const baseHeaders = ['kode_aset', 'nama_aset', 'kategori', 'lokasi', 'merek', 'model', 'nomor_seri', 'harga_beli', 'status'];
        let extraHeaders: string[] = [];
        let sampleValues: string[] = [];

        if (selectedCategoryId) {
            const category = categories.find((c: any) => c.id === selectedCategoryId);
            if (category && category.attributes && Array.isArray(category.attributes)) {
                extraHeaders = category.attributes;
                sampleValues = extraHeaders.map(attr => {
                    const cleanAttr = attr.toLowerCase();
                    if (cleanAttr.includes('jam') || cleanAttr.includes('hour')) return '1500';
                    if (cleanAttr.includes('plat') || cleanAttr.includes('plate')) return 'B 1234 SJS';
                    if (cleanAttr.includes('ton') || cleanAttr.includes('kapasitas')) return '20 Ton';
                    if (cleanAttr.includes('warna') || cleanAttr.includes('color')) return 'Kuning';
                    if (cleanAttr.includes('tahun') || cleanAttr.includes('year')) return '2023';
                    return 'Contoh Nilai';
                });
            }
        }

        const selectedCat = categories.find((c: any) => c.id === selectedCategoryId);
        const headers = [...baseHeaders, ...extraHeaders.map(h => `spec_${h}`)];
        const sampleRow = [
            'AST-101',
            'Excavator PC200',
            selectedCat ? (selectedCat.code || selectedCat.name) : (categories[0]?.code || 'EXC'),
            locations[0]?.name || 'Gudang Utama',
            'Komatsu',
            'PC200',
            'SN-998822',
            '1500000000',
            'in_inventory',
            ...sampleValues
        ];

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `template_import_aset_${selectedCategoryId ? 'kategori' : 'generik'}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };



    return (
        <Modal
            isOpen={opened}
            onClose={handleClose}
            title="Batch Import Assets"
            size="3xl"
        >
            <div className="space-y-4">
                {!file ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={18} />}>
                            Select CSV File
                        </Button>
                        <p className="text-xs text-muted-foreground">Supported format: CSV (Comma separated)</p>
                        <div className="bg-muted/50 p-4 rounded-lg border border-border w-full max-w-lg mb-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground/80">Pilih Kategori Spesifik (Auto-Fill Fallback & Atribut Khusus)</label>
                                    <Select
                                        value={selectedCategoryId}
                                        onChange={setSelectedCategoryId}
                                        options={[
                                            { value: '', label: 'Generik (Kategori dari kolom CSV)' },
                                            ...categories.map((c: any) => ({
                                                value: c.id,
                                                label: `${c.name} (${c.code || 'ID'})`
                                            }))
                                        ]}
                                    />
                                    <p className="text-[10px] text-muted-foreground/60">
                                        Memilih kategori akan otomatis mengisi kategori jika kolom CSV kosong & menyertakan kolom atribut spesifiknya.
                                    </p>
                                </div>

                                <Button className="w-full" variant="outline" onClick={downloadTemplate} leftIcon={<FileSpreadsheet size={16} />}>
                                    Unduh Template CSV {selectedCategoryId ? 'Kategori Spesifik' : 'Generik'}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">Preview: {previewData.length} rows</span>
                            <Button variant="danger" size="sm" onClick={() => { setFile(null); setPreviewData([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} leftIcon={<Trash size={16} />}>
                                Clear
                            </Button>
                        </div>

                        <div className="max-h-[300px] overflow-auto border border-border rounded-lg">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableTh>Valid</TableTh>
                                        <TableTh>Kode</TableTh>
                                        <TableTh>Nama Aset</TableTh>
                                        <TableTh>Kategori</TableTh>
                                        <TableTh>Lokasi</TableTh>
                                        <TableTh>Spesifikasi Khusus</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableTd>
                                                <div className="flex items-center justify-center">
                                                    {row._isValid ? <Check size={18} className="text-emerald-500" /> : <X size={18} className="text-red-500" />}
                                                </div>
                                            </TableTd>
                                            <TableTd>{row.asset_code}</TableTd>
                                            <TableTd>{row.name}</TableTd>
                                            <TableTd>
                                                {row._categoryId ? (
                                                    <span className="text-sm font-medium text-foreground">{row.category_display || row.category}</span>
                                                ) : (
                                                    <Badge variant="danger">Invalid Kategori: {row.category || 'Kosong'}</Badge>
                                                )}
                                            </TableTd>
                                            <TableTd>
                                                {row.location ? (
                                                    row._locationId ? (
                                                        <span className="text-sm">{row.location}</span>
                                                    ) : (
                                                        <Badge variant="warning">Unknown: {row.location}</Badge>
                                                    )
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableTd>
                                            <TableTd>
                                                {Object.keys(row._specifications || {}).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(row._specifications).slice(0, 3).map(([k, v]) => (
                                                            <Badge key={k} variant="info" size="sm">
                                                                {k}: {String(v)}
                                                            </Badge>
                                                        ))}
                                                        {Object.keys(row._specifications).length > 3 && (
                                                            <span className="text-[10px] text-muted-foreground self-center">
                                                                +{Object.keys(row._specifications).length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Generik</span>
                                                )}
                                            </TableTd>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 text-right w-full pt-4 border-t border-border">
                            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                            <Button
                                onClick={handleImport}
                                loading={loading}
                                disabled={previewData.filter(r => r._isValid).length === 0}
                            >
                                Import {previewData.filter(r => r._isValid).length} Assets
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
