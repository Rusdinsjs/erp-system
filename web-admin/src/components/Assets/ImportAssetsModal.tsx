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

export function ImportAssetsModal({ opened, onClose, onSuccess, categories, locations }: ImportAssetsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);



    // Template State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { success, error: showError } = useToast();

    // Helpers to find IDs by name
    const findCategoryId = (name: string) => {
        const cat = categories.find((c: any) =>
            c.name.toLowerCase() === name.toLowerCase() ||
            c.code.toLowerCase() === name.toLowerCase()
        );
        return cat?.id;
    };

    const findLocationId = (name: string) => {
        const loc = locations.find((l: any) =>
            l.name.toLowerCase() === name.toLowerCase() ||
            l.code.toLowerCase() === name.toLowerCase()
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
                    const processed = results.data.map((row: any) => {
                        const categoryId = findCategoryId(row.category || '');
                        const locationId = findLocationId(row.location || '');

                        // Extract Custom Attributes (columns starting with 'spec_' or just treated as extra)
                        // Simple approach: any known field goes to root, others go to specifications
                        const knownFields = ['asset_code', 'name', 'category', 'location', 'brand', 'model', 'serial_number', 'purchase_price', 'is_rental'];
                        const specifications: Record<string, any> = {};

                        Object.keys(row).forEach(key => {
                            if (!knownFields.includes(key) && row[key]) {
                                // removing 'spec_' prefix if present, or just using key
                                const cleanKey = key.startsWith('spec_') ? key.replace('spec_', '') : key;
                                specifications[cleanKey] = row[key];
                            }
                        });

                        return {
                            ...row,
                            _categoryId: categoryId,
                            _locationId: locationId,
                            _specifications: specifications,
                            _isValid: !!row.asset_code && !!row.name && !!categoryId
                        };
                    });
                    setPreviewData(processed);
                },
                error: (err) => {
                    console.error('CSV Parse Error:', err);
                    showError('Failed to parse CSV', 'Error');
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
            const assets = validRows.map(row => ({
                asset_code: row.asset_code,
                name: row.name,
                category_id: row._categoryId,
                location_id: row._locationId || null,
                brand: row.brand || null,
                model: row.model || null,
                purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
                status: 'active',
                is_rental: row.is_rental === 'true' || row.is_rental === '1',
                specifications: Object.keys(row._specifications || {}).length > 0 ? row._specifications : undefined
            }));

            await api.post('/assets/bulk', { assets });

            success(`Successfully imported ${assets.length} assets`, 'Success');
            onSuccess();
            handleClose();
        } catch (err: any) {
            showError(err.response?.data?.message || 'Import failed', 'Error');
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
        const baseHeaders = ['asset_code', 'name', 'category', 'location', 'brand', 'model', 'serial_number', 'purchase_price', 'is_rental'];
        let extraHeaders: string[] = [];

        if (selectedCategoryId) {
            const category = categories.find((c: any) => c.id === selectedCategoryId);
            if (category && category.attributes && Array.isArray(category.attributes)) {
                extraHeaders = category.attributes;
            }
        }

        // Add 'spec_' prefix to extra headers for clarity in CSV
        const headers = [...baseHeaders, ...extraHeaders.map(h => `spec_${h}`)];

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `import_template_${selectedCategoryId ? 'category_' + selectedCategoryId : 'generic'}.csv`);
        document.body.appendChild(link);
        link.click();
    };



    return (
        <Modal
            isOpen={opened}
            onClose={handleClose}
            title="Batch Import Assets"
            size="xl"
        // Footer removed from props, manually added to content below
        >
            <div className="space-y-4">
                {!file ? (
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/50 transition-colors">
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
                        <p className="text-xs text-slate-500">Supported format: CSV (Comma separated)</p>
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 w-full max-w-lg mb-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Select Template by Category (Optional)</label>
                                    <Select
                                        value={selectedCategoryId}
                                        onChange={setSelectedCategoryId}
                                        options={[
                                            { value: '', label: 'Generic (Basic Fields Only)' },
                                            ...categories.map((c: any) => ({
                                                value: c.id,
                                                label: c.name
                                            }))
                                        ]}
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        Selecting a category will add its specific attribute columns (e.g., spec_RAM, spec_Color) to the CSV.
                                    </p>
                                </div>

                                <Button className="w-full" variant="outline" onClick={downloadTemplate} leftIcon={<FileSpreadsheet size={16} />}>
                                    Download Template CSV
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-white">Preview: {previewData.length} rows</span>
                            <Button variant="danger" size="sm" onClick={() => { setFile(null); setPreviewData([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} leftIcon={<Trash size={16} />}>
                                Clear
                            </Button>
                        </div>

                        <div className="max-h-[300px] overflow-auto border border-slate-700 rounded-lg">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableTh>Status</TableTh>
                                        <TableTh>Code</TableTh>
                                        <TableTh>Name</TableTh>
                                        <TableTh>Category</TableTh>
                                        <TableTh>Location</TableTh>
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
                                                    <span className="text-sm">{row.category}</span>
                                                ) : (
                                                    <Badge variant="danger">Invalid: {row.category}</Badge>
                                                )}
                                            </TableTd>
                                            <TableTd>
                                                {row.location ? (
                                                    row._locationId ? (
                                                        <span className="text-sm">{row.location}</span>
                                                    ) : (
                                                        <Badge variant="warning">Unknown: {row.location}</Badge>
                                                    )
                                                ) : <span className="text-slate-500">-</span>}
                                            </TableTd>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 text-right w-full pt-4 border-t border-slate-700">
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
