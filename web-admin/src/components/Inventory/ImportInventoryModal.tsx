// ImportInventoryModal - Pure Tailwind
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Trash, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import { inventoryApi } from '../../api/inventory';
import { Modal, Button, Table, TableHead, TableBody, TableRow, TableTh, TableTd, Badge, useToast } from '../ui';

interface ImportInventoryModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: any[];
}

export function ImportInventoryModal({ opened, onClose, onSuccess, categories }: ImportInventoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
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

                        return {
                            ...row,
                            _categoryId: categoryId,
                            _isValid: !!row.sku && !!row.name && !!categoryId && !!row.initial_quantity
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
            const items = validRows.map(row => ({
                sku: row.sku,
                name: row.name,
                category_id: row._categoryId,
                description: row.description || null,
                unit_id: 1, // Default to 1 (Pcs) or map from row.unit
                min_stock: row.min_stock ? parseFloat(row.min_stock) : 0,
                max_stock: row.max_stock ? parseFloat(row.max_stock) : 0,
                initial_quantity: row.initial_quantity ? parseFloat(row.initial_quantity) : 0,
                purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : 0,
            }));

            await inventoryApi.bulkCreate({ items });

            success(`Successfully imported ${items.length} inventory items`, 'Success');
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
        const headers = ['sku', 'name', 'category', 'description', 'min_stock', 'max_stock', 'initial_quantity', 'purchase_price'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_import_template.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <Modal
            isOpen={opened}
            onClose={handleClose}
            title="Batch Import Inventory"
            size="3xl"
        >
            <div className="space-y-4">
                {!file ? (
                    <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-6 hover:border-cyan-500/50 transition-colors bg-slate-900/30">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center">
                            <Upload size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-medium">Select CSV File to Upload</p>
                            <p className="text-xs text-slate-500 mt-1">Supported format: CSV (Comma separated)</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Button onClick={() => fileInputRef.current?.click()} variant="primary" className="bg-cyan-600 hover:bg-cyan-500">
                                Browse File
                            </Button>
                            <Button variant="ghost" onClick={downloadTemplate} leftIcon={<FileSpreadsheet size={16} />}>
                                Download Template
                            </Button>
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

                        <div className="max-h-[400px] overflow-auto border border-slate-800 rounded-2xl bg-slate-950">
                            <Table>
                                <TableHead>
                                    <TableRow className="bg-slate-900 border-slate-800">
                                        <TableTh>Status</TableTh>
                                        <TableTh>SKU</TableTh>
                                        <TableTh>Name</TableTh>
                                        <TableTh>Category</TableTh>
                                        <TableTh>Initial Qty</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row, idx) => (
                                        <TableRow key={idx} className="border-slate-800/50">
                                            <TableTd>
                                                <div className="flex items-center justify-center">
                                                    {row._isValid ? <Check size={18} className="text-emerald-500" /> : <X size={18} className="text-red-500" />}
                                                </div>
                                            </TableTd>
                                            <TableTd className="font-mono text-cyan-400">{row.sku}</TableTd>
                                            <TableTd className="text-white">{row.name}</TableTd>
                                            <TableTd>
                                                {row._categoryId ? (
                                                    <span className="text-slate-400">{row.category}</span>
                                                ) : (
                                                    <Badge variant="danger">Invalid: {row.category}</Badge>
                                                )}
                                            </TableTd>
                                            <TableTd className="text-right text-white font-bold">{row.initial_quantity}</TableTd>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                            <Button
                                onClick={handleImport}
                                loading={loading}
                                className="bg-cyan-600 hover:bg-cyan-500"
                                disabled={previewData.filter(r => r._isValid).length === 0}
                            >
                                Import {previewData.filter(r => r._isValid).length} Items
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
