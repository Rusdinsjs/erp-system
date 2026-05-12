import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card } from '../ui';

interface AssetFinancialsProps {
    maintenanceCost: number;
    rentalIncome: number;
    purchasePrice?: number;
}

export function AssetFinancials({ maintenanceCost, rentalIncome, purchasePrice }: AssetFinancialsProps) {
    const netProfit = rentalIncome - maintenanceCost;
    const isProfitable = netProfit >= 0;

    // Calculate ROI if purchase price exists
    const roi = purchasePrice ? ((rentalIncome - maintenanceCost - purchasePrice) / purchasePrice) * 100 : null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Card className="p-0 overflow-hidden border-border">
            <div className="p-4 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <DollarSign size={18} className="text-primary" />
                    Financial Overview (TCO & ROI)
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border text-center">

                {/* Maintenance Section */}
                <div className="p-6 bg-muted/20 grouped-stat">
                    <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-red-500/10 mb-3">
                            <TrendingDown size={20} className="text-red-400" />
                        </div>
                        <span className="text-sm text-muted-foreground mb-1">Total Maintenance Cost</span>
                        <span className="text-xl font-bold text-foreground tracking-tight">
                            {formatCurrency(maintenanceCost)}
                        </span>
                        <div className="mt-2 text-xs text-muted-foreground/70">
                            (Service + Repairs + Parts)
                        </div>
                    </div>
                </div>

                {/* Income Section */}
                <div className="p-6 bg-muted/20 grouped-stat">
                    <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-green-500/10 mb-3">
                            <TrendingUp size={20} className="text-green-400" />
                        </div>
                        <span className="text-sm text-muted-foreground mb-1">Total Rental Income</span>
                        <span className="text-xl font-bold text-foreground tracking-tight">
                            {formatCurrency(rentalIncome)}
                        </span>
                        <div className="mt-2 text-xs text-muted-foreground/70">
                            (Revenue from completed rentals)
                        </div>
                    </div>
                </div>

                {/* Profit/Loss Section */}
                <div className={`p-6 ${isProfitable ? 'bg-green-500/5' : 'bg-red-500/5'} grouped-stat`}>
                    <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full mb-3 ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <Activity size={20} className={isProfitable ? 'text-green-400' : 'text-red-400'} />
                        </div>
                        <span className="text-sm text-muted-foreground mb-1">Net Operational Profit</span>
                        <span className={`text-xl font-bold tracking-tight ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(netProfit)}
                        </span>

                        {roi !== null && (
                            <div className={`mt-2 text-xs px-2 py-0.5 rounded-full ${roi >= 0
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                                }`}>
                                ROI: {roi.toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
