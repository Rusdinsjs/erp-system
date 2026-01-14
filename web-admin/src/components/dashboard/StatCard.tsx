// StatCard - Pure Tailwind
import { type LucideIcon } from 'lucide-react';
import { Card } from '../ui';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string; // Tailwind color class e.g. "text-blue-500" or hex if handled
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive: boolean;
    };
}

export function StatCard({ label, value, icon: Icon, color, description, trend }: StatCardProps) {
    return (
        <Card padding="md" className="h-full">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {label}
                </span>
                <div className={`p-1.5 rounded-lg bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
                    <Icon size={20} className={color} strokeWidth={1.5} />
                </div>
            </div>

            <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-bold text-white leading-none">
                    {value}
                </span>
                {trend && (
                    <span className={`text-sm font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trend.value > 0 ? '+' : ''}{trend.value}%
                    </span>
                )}
            </div>

            {(description || trend) && (
                <p className="text-xs text-slate-500 mt-2">
                    {trend ? trend.label : description}
                </p>
            )}
        </Card>
    );
}
