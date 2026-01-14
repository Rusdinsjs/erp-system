// Tree Component - Pure Tailwind
import type { ReactNode } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

interface TreeItemProps {
    label: ReactNode;
    children?: ReactNode;
    isExpanded?: boolean;
    onToggle?: (e: React.MouseEvent) => void;
    isActive?: boolean;
    onClick?: () => void;
    hasChildren?: boolean;
    actions?: ReactNode;
    depth?: number;
}

export function TreeItem({
    label,
    children,
    isExpanded = false,
    onToggle,
    isActive = false,
    onClick,
    hasChildren = false,
    actions,
    depth = 0,
}: TreeItemProps) {
    return (
        <div className="select-none">
            <div
                className={`
                    group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-colors
                    ${isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={onClick}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <button
                        onClick={onToggle}
                        className={`
                            p-0.5 rounded-md hover:bg-slate-700/50 transition-colors
                            ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}
                        `}
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                    </button>

                    <div className="text-slate-500">
                        {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                    </div>

                    <div className="truncate font-medium text-sm">
                        {label}
                    </div>
                </div>

                {actions && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {actions}
                    </div>
                )}
            </div>

            {isExpanded && children && (
                <div>
                    {children}
                </div>
            )}
        </div>
    );
}
