import { useQuery } from '@tanstack/react-query';
import { assetApi } from '../../api/assets';
import { Card } from '../ui'; // Assuming Card is exported from ui
import { AlertCircle, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ExpiryItem {
    id: string; // combination of asset_id + type
    asset_id: string;
    asset_name: string;
    license_plate: string;
    doc_type: 'STNK' | 'Tax' | 'KIR';
    expiry_date: string;
    days_remaining: number;
}

export function VehicleLegalityWidget() {
    const { data: assets, isLoading } = useQuery({
        queryKey: ['assets', 'expiring'],
        queryFn: () => assetApi.getExpiring(30), // 30 days lookahead
    });

    // Process assets into expiry items
    const expiryItems: ExpiryItem[] = [];
    if (assets) {
        const now = dayjs();
        assets.forEach((asset) => {
            const vd = asset.vehicle_details;
            if (!vd) return;

            const check = (dateStr: string | undefined, type: 'STNK' | 'Tax' | 'KIR') => {
                if (!dateStr) return;
                const date = dayjs(dateStr);
                const diff = date.diff(now, 'day');

                // Show if overdue or within 30 days
                // (Backend already filters, but we process for display)
                expiryItems.push({
                    id: `${asset.id}-${type}`,
                    asset_id: asset.id,
                    asset_name: asset.name,
                    license_plate: vd.license_plate || '-',
                    doc_type: type,
                    expiry_date: dateStr,
                    days_remaining: diff
                });
            };

            check(vd.stnk_expiry, 'STNK');
            check(vd.tax_expiry, 'Tax');
            check(vd.kir_expiry, 'KIR');
        });
    }

    // Sort by most urgent
    expiryItems.sort((a, b) => a.days_remaining - b.days_remaining);

    // Limit to top 5
    const displayItems = expiryItems.slice(0, 5);

    return (
        <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertCircle size={20} className="text-orange-500" />
                    <h2 className="text-lg font-semibold text-foreground">Vehicle Legality</h2>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                    Next 30 Days
                </span>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
                    ))}
                </div>
            ) : displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                    <p className="text-sm font-medium text-foreground">All Documents Valid</p>
                    <p className="text-xs text-muted-foreground">No expirations in the next 30 days.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.doc_type === 'STNK' ? 'bg-blue-500/10 text-blue-400' :
                                    item.doc_type === 'Tax' ? 'bg-purple-500/10 text-purple-400' :
                                        'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{item.asset_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="bg-background px-1.5 py-0.5 rounded border border-border">{item.license_plate}</span>
                                        <span>•</span>
                                        <span>{item.doc_type}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold ${item.days_remaining < 0 ? 'text-red-500' :
                                    item.days_remaining < 7 ? 'text-orange-400' :
                                        'text-foreground'
                                    }`}>
                                    {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d Overdue` : `${item.days_remaining}d Left`}
                                </p>
                                <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                    <Calendar size={10} />
                                    <span>{dayjs(item.expiry_date).format('DD MMM YYYY')}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {expiryItems.length > 5 && (
                        <button className="w-full py-2 text-xs text-center text-muted-foreground hover:text-foreground transition-colors border-t border-border mt-2">
                            + {expiryItems.length - 5} more items
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
}
