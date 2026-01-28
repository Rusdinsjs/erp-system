import {
    CheckCircle,
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
import type { LifecycleHistory } from '../../api/lifecycle';

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
            default: return 'text-muted-foreground bg-muted/10 border-border/20';
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
        <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {history.map((item, index) => {
                const isLatest = index === 0;

                return (
                    <div key={item.id} className="relative group">
                        {/* Timeline Dot */}
                        <div className={`
                            absolute left-0 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 
                            transition-colors duration-300 z-10
                            ${isLatest
                                ? 'bg-primary border-primary shadow-[0_0_12px_rgba(var(--primary),0.5)]'
                                : 'bg-card border-border group-hover:border-muted-foreground'
                            }
                        `} />

                        {/* Content Card */}
                        <div className={`
                            ml-6 p-4 rounded-xl border transition-all duration-300
                            ${isLatest
                                ? 'bg-muted/80 border-primary/30 shadow-lg'
                                : 'bg-card/50 border-border hover:bg-muted hover:border-muted-foreground/50'
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
                                    <div className="text-sm text-muted-foreground italic pl-3 border-l-2 border-border">
                                        "{item.reason}"
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
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
