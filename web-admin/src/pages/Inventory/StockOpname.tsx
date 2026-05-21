
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type InventoryItem, type BatchInventoryAdjustmentRequest } from '../../api/inventory';
import { Save, RefreshCw, Search, ClipboardCheck, AlertCircle, Package } from 'lucide-react';
import { showToast } from '../../components/ui/Toast';
import {
    Card,
    Button,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty, TableSkeleton
} from '../../components/ui';

const StockOpname: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [physicalCounts, setPhysicalCounts] = useState<{ [itemId: string]: number }>({});
    const [globalNote, setGlobalNote] = useState('');

    // Fetch Inventory Items
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['inventory-items'],
        queryFn: () => inventoryApi.listItems()
    });

    // Batch Adjustment Mutation
    const adjustMut = useMutation({
        mutationFn: inventoryApi.batchAdjust,
        onSuccess: () => {
            showToast('Stock adjustment submitted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            setPhysicalCounts({});
            setGlobalNote('');
        },
        onError: () => showToast('Failed to submit stock adjustment', 'error')
    });

    const handleCountChange = (itemId: string, val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setPhysicalCounts(prev => ({ ...prev, [itemId]: num }));
        } else if (val === '') {
            const newCounts = { ...physicalCounts };
            delete newCounts[itemId];
            setPhysicalCounts(newCounts);
        }
    };

    const changes = useMemo(() => {
        return items.filter((item: InventoryItem) => {
            const physical = physicalCounts[item.id];
            return physical !== undefined && physical !== parseFloat(item.current_quantity.toString());
        }).map((item: InventoryItem) => {
            const physical = physicalCounts[item.id];
            const current = parseFloat(item.current_quantity.toString());
            return {
                ...item,
                physical,
                diff: physical - current
            };
        });
    }, [items, physicalCounts]);

    const handleSubmit = () => {
        if (changes.length === 0) {
            showToast('No changes to submit', 'info');
            return;
        }

        const payload: BatchInventoryAdjustmentRequest = {
            items: changes.map((c: InventoryItem & { diff: number }) => ({
                item_id: c.id,
                quantity: c.diff,
                unit_price: c.average_cost,
            })),
            notes: globalNote || 'Stock Opname'
        };

        if (confirm(`Submit ${changes.length} adjustments?`)) {
            adjustMut.mutate(payload);
        }
    };

    const filteredItems = items.filter((item: InventoryItem) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const totalItems = items.length;
    const itemsCounted = Object.keys(physicalCounts).length;
    const itemsWithDiscrepancy = changes.length;

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Stock Opname</h1>
                    <p className="text-muted-foreground mt-2">Reconcile physical inventory with system records</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw size={18} />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory-items'] })}
                        className="rounded-xl"
                    >
                        Refresh Data
                    </Button>
                    <Button
                        leftIcon={<Save size={18} />}
                        onClick={handleSubmit}
                        disabled={changes.length === 0 || adjustMut.isPending}
                        className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer"
                    >
                        {adjustMut.isPending ? 'Submitting...' : `Submit Adjustments (${changes.length})`}
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Total Items</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">{totalItems}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Package className="text-blue-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Items Counted</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">{itemsCounted}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <ClipboardCheck className="text-emerald-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110 ${itemsWithDiscrepancy > 0 ? 'bg-amber-500/10' : 'bg-muted/10'}`} />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Discrepancies</p>
                            <h3 className={`text-3xl font-bold mt-1 ${itemsWithDiscrepancy > 0 ? 'text-amber-400' : 'text-foreground'}`}>
                                {itemsWithDiscrepancy}
                            </h3>
                        </div>
                        <div className={`p-3 rounded-xl ${itemsWithDiscrepancy > 0 ? 'bg-amber-500/20' : 'bg-muted/20'}`}>
                            <AlertCircle className={itemsWithDiscrepancy > 0 ? 'text-amber-400' : 'text-muted-foreground'} size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0">
                {/* Search & Filters Bar */}
                <div className="p-4 border-b border-border flex gap-4 bg-muted/20">
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Batch Adjustment Note (e.g. End of Month Count)"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            value={globalNote}
                            onChange={e => setGlobalNote(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
                    ) : (
                        <Table className="border-none">
                            <TableHead>
                                <TableRow className="bg-muted/20 border-border">
                                    <TableTh>Item Details</TableTh>
                                    <TableTh align="right">System Qty</TableTh>
                                    <TableTh align="right" className="w-48">Physical Qty</TableTh>
                                    <TableTh align="right">Difference</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredItems.map((item: InventoryItem) => {
                                    const current = parseFloat(item.current_quantity.toString());
                                    const physical = physicalCounts[item.id];
                                    const diff = physical !== undefined ? physical - current : 0;
                                    const hasChange = physical !== undefined && physical !== current;

                                    return (
                                        <TableRow key={item.id} className={`border-border transition-colors ${hasChange ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/40'}`}>
                                            <TableTd>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{item.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</span>
                                                </div>
                                            </TableTd>
                                            <TableTd align="right">
                                                <span className="text-foreground/80 font-medium">{current}</span>
                                            </TableTd>
                                            <TableTd align="right">
                                                <input
                                                    type="number"
                                                    className={`w-32 px-3 py-1.5 text-right bg-background border rounded-lg focus:ring-2 outline-none transition-all ${hasChange
                                                        ? 'border-amber-500/50 focus:ring-amber-500/50 text-amber-600 dark:text-amber-100'
                                                        : 'border-border focus:ring-primary/40 text-foreground focus:border-primary/40'
                                                        }`}
                                                    placeholder={current.toString()}
                                                    value={physicalCounts[item.id] !== undefined ? physicalCounts[item.id] : ''}
                                                    onChange={e => handleCountChange(item.id, e.target.value)}
                                                />
                                            </TableTd>
                                            <TableTd align="right">
                                                {hasChange ? (
                                                    <span className={`font-bold font-mono px-2 py-1 rounded-lg text-sm ${diff > 0
                                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                                        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
                                                        }`}>
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableTd>
                                        </TableRow>
                                    );
                                })}
                                {filteredItems.length === 0 && (
                                    <TableEmpty colSpan={4} message="No items found matching your search." />
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default StockOpname;
