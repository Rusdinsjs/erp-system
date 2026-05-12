import { useState, useEffect } from 'react';
import { Package, Search, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { inventoryApi } from '../../api/inventory';

interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    current_quantity: number | string;
    average_cost: number | string;
    unit_id: number;
}

interface InventoryItemSelectorProps {
    value?: string | null;
    onChange: (item: InventoryItem | null) => void;
    error?: string;
    label?: string;
    required?: boolean;
}

export function InventoryItemSelector({
    value,
    onChange,
    error,
    label = "Select Inventory Item",
    required
}: InventoryItemSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const { error: showError } = useToast();

    // Local debounce
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch items
    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                // Use inventoryApi instead of raw fetch
                const response = await inventoryApi.listItems({
                    search: debouncedSearch,
                    limit: 20
                });

                // items might be in 'data' field or direct array
                const allItems: InventoryItem[] = Array.isArray(response) ? response : (response as any).items || (response as any).data || [];
                setItems(allItems);
            } catch (err) {
                console.error(err);
                if (debouncedSearch) {
                    showError('Failed to load inventory items', 'Error');
                }
            } finally {
                setLoading(false);
            }
        };

        if (isOpen || debouncedSearch) {
            fetchItems();
        }
    }, [debouncedSearch, isOpen]);

    // Sync value
    useEffect(() => {
        if (!value) {
            setSelectedItem(null);
            return;
        }
        const found = items.find(i => i.id === value);
        if (found) setSelectedItem(found);
    }, [value, items]);

    const handleSelect = (item: InventoryItem) => {
        setSelectedItem(item);
        onChange(item);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`bg-black/20 border ${error ? 'border-red-500' : 'border-white/5'} hover:border-white/10 rounded-xl p-3 cursor-pointer transition-colors flex items-center justify-between`}
            >
                {selectedItem ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
                            <Package size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-medium text-white truncate">{selectedItem.name}</div>
                            <div className="text-xs text-emerald-400">
                                Stock: {Number(selectedItem.current_quantity).toLocaleString()} | Cost: Rp {Number(selectedItem.average_cost).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-500">{label} {required && '*'}</span>
                )}
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-white/5">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search name or SKU..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                    // Prevent the input click from bubbling up to the wrapper and closing the dropdown
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />}
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {items.length > 0 ? (
                                items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3 group"
                                    >
                                        <div className="p-2 bg-gray-800 rounded-lg text-gray-400 group-hover:text-blue-400 transition-colors">
                                            <Package size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-200 group-hover:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.sku}</div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={Number(item.current_quantity) > 0 ? "success" : "danger"} className="mb-1">
                                                Stock: {Number(item.current_quantity)}
                                            </Badge>
                                            <div className="text-xs text-gray-400">
                                                Rp {Number(item.average_cost).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    {loading ? 'Searching...' : 'No items found'}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
