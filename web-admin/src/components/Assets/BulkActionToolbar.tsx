import { Trash2, MapPin, Building2, CheckCircle, X } from 'lucide-react';
import { Button, Card, ActionIcon } from '../ui';

interface BulkActionToolbarProps {
    selectedCount: number;
    onClear: () => void;
    onAction: (action: 'status' | 'location' | 'department' | 'delete') => void;
}

export function BulkActionToolbar({ selectedCount, onClear, onAction }: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <Card className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border-blue-500/50 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] z-50 p-4">
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                        {selectedCount}
                    </div>
                    <div>
                        <p className="text-white font-semibold text-sm">Assets Selected</p>
                        <button
                            onClick={onClear}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Deselect all
                        </button>
                    </div>
                </div>

                <div className="h-10 w-px bg-slate-700/50" />

                <div className="flex items-center gap-2 flex-1 justify-center">
                    <Button
                        variant="ghost"
                        leftIcon={<CheckCircle size={18} />}
                        onClick={() => onAction('status')}
                        className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-10"
                    >
                        Status
                    </Button>
                    <Button
                        variant="ghost"
                        leftIcon={<MapPin size={18} />}
                        onClick={() => onAction('location')}
                        className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-10"
                    >
                        Location
                    </Button>
                    <Button
                        variant="ghost"
                        leftIcon={<Building2 size={18} />}
                        onClick={() => onAction('department')}
                        className="text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-10"
                    >
                        Dept
                    </Button>
                    <div className="w-px h-6 bg-slate-700/50 mx-1" />
                    <Button
                        variant="ghost"
                        leftIcon={<Trash2 size={18} />}
                        onClick={() => onAction('delete')}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-10"
                    >
                        Delete
                    </Button>
                </div>

                <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={onClear}
                    className="text-slate-500 hover:text-slate-300"
                >
                    <X size={18} />
                </ActionIcon>
            </div>
        </Card>
    );
}
