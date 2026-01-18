import {
    CheckCircle,
    AlertTriangle,
    Truck,
    Wrench,
    Hammer,
    Box,
    ArrowRight,
    User,
    Calendar,
    FileText,
    Archive,
    Trash2,
    Search
} from 'lucide-react';
import { Card } from '../ui';

export interface LifecycleHistory {
    id: string;
    asset_id: string;
    from_state: string;
    to_state: string;
    reason?: string;
    performed_by?: string;
    performed_by_name?: string;
    created_at: string;
}

interface LifecycleTimelineProps {
    history: LifecycleHistory[];
}

export function LifecycleTimeline({ history }: LifecycleTimelineProps) {

    const getIconForState = (state: string) => {
        switch (state) {
            case 'in_inventory': return <Box size={16} />;
            case 'deployed': return <CheckCircle size={16} />;
            case 'rented_out': return <Truck size={16} />;
            case 'under_maintenance': return <Wrench size={16} />;
            case 'under_repair': return <Hammer size={16} />;
            case 'disposed': return <Trash2 size={16} />;
            case 'retired': return <Archive size={16} />;
            case 'lost_stolen': return <Search size={16} />;
            default: return <CheckCircle size={16} />;
        }
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'in_inventory': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'deployed': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'rented_out': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            case 'under_maintenance': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'under_repair': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const formatStateLabel = (label: string) => {
        return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <FileText size={48} className="mb-4 opacity-50" />
                <p>No lifecycle history available</p>
            </div>
        );
    }

    return (
        <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {history.map((item, index) => {
                const isLatest = index === 0;

                return (
                    <div key={item.id} className="relative group">
                        {/* Timeline Dot */}
                        <div className={`
                            absolute left-0 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 
                            transition-colors duration-300 z-10
                            ${isLatest
                                ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                                : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'
                            }
                        `} />

                        {/* Content Card */}
                        <div className={`
                            ml-6 p-4 rounded-xl border transition-all duration-300
                            ${isLatest
                                ? 'bg-slate-800/80 border-cyan-500/30 shadow-lg'
                                : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                            }
                        `}>
                            {/* Header: States */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium ${getStateColor(item.from_state)}`}>
                                    {getIconForState(item.from_state)}
                                    <span>{formatStateLabel(item.from_state)}</span>
                                </div>

                                <ArrowRight size={14} className="text-slate-500" />

                                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium ${getStateColor(item.to_state)}`}>
                                    {getIconForState(item.to_state)}
                                    <span>{formatStateLabel(item.to_state)}</span>
                                </div>

                                <div className="ml-auto text-xs text-slate-500 whitespace-nowrap">
                                    {new Date(item.created_at).toLocaleString()}
                                </div>
                            </div>

                            {/* Body: Info */}
                            <div className="space-y-2">
                                {item.reason && (
                                    <div className="text-sm text-slate-300 italic pl-3 border-l-2 border-slate-700">
                                        "{item.reason}"
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800/50">
                                    <div className="flex items-center gap-1.5">
                                        <User size={12} />
                                        <span>{item.performed_by_name || 'System / Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
