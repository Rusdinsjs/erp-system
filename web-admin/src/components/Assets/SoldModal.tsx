import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Calculator } from 'lucide-react';
import { assetApi } from '../../api/assets';
import {
    Modal,
    Button,
    Textarea,
    Input,
    useToast
} from '../ui';

// Local formatter if not available
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

interface SoldModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    purchasePrice?: number; // Optional, for estimtation
    onSuccess?: () => void;
}

export function SoldModal({ opened, onClose, assetId, purchasePrice, onSuccess }: SoldModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        sale_price: '',
        sale_date: new Date().toISOString().split('T')[0],
        sold_to: '',
        notes: '',
    });

    const [gainLoss, setGainLoss] = useState<number | null>(null);

    // Calculate generic gain/loss preview (Simplified: Sale - Purchase)
    // Note: Real book value depends on depreciation which is complex to calc on frontend without more data
    useEffect(() => {
        if (purchasePrice && formData.sale_price) {
            const price = parseFloat(formData.sale_price);
            if (!isNaN(price)) {
                setGainLoss(price - purchasePrice);
            }
        }
    }, [formData.sale_price, purchasePrice]);

    const mutation = useMutation({
        mutationFn: () => assetApi.sell(assetId, {
            sale_price: parseFloat(formData.sale_price),
            sale_date: formData.sale_date,
            sold_to: formData.sold_to,
            notes: formData.notes
        }),
        onSuccess: (data: any) => {
            success(data.message || 'Asset sold successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            queryClient.invalidateQueries({ queryKey: ['asset-detail', assetId] });
            onClose();
            onSuccess?.();
        },
        onError: (err: any) => showError(err.message || 'Failed to sell asset', 'Error'),
    });

    const handleSubmit = () => {
        if (!formData.sale_price || !formData.sold_to || !formData.sale_date) {
            showError('Please fill in all required fields', 'Validation Error');
            return;
        }
        mutation.mutate();
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="Sell Asset" size="md">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <DollarSign size={24} className="text-emerald-500" />
                    <div>
                        <p className="text-emerald-500 font-medium">Asset Sale</p>
                        <p className="text-sm text-muted-foreground">
                            This will mark the asset as Sold and generate a generic Financial Journal Entry for the sale.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Sale Price (Rp) *"
                        type="number"
                        placeholder="0"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        leftIcon={<span className="text-muted-foreground text-xs">Rp</span>}
                    />
                    <Input
                        label="Sale Date *"
                        type="date"
                        value={formData.sale_date}
                        onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    />
                </div>

                <Input
                    label="Sold To (Buyer Name) *"
                    placeholder="PT. Buyer Name or Individual"
                    value={formData.sold_to}
                    onChange={(e) => setFormData({ ...formData, sold_to: e.target.value })}
                />

                {/* Financial Preview */}
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between border border-border">
                    <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Est. Gain/Loss (vs Purchase)</span>
                    </div>
                    {gainLoss !== null ? (
                        <span className={`font-mono font-medium ${gainLoss >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                    )}
                </div>
                {gainLoss !== null && (
                    <p className="text-[10px] text-muted-foreground italic text-right">
                        * Final profit calculation will use Net Book Value (Purchase - Depreciation) on server.
                    </p>
                )}

                <Textarea
                    label="Notes"
                    placeholder="Additional sale details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        // variant="primary" // Button component might not have primary, usually default
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleSubmit}
                        loading={mutation.isPending}
                    >
                        Confirm Sale
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
