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
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={onClick}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <button
                        onClick={onToggle}
                        className={`
                            p-0.5 rounded-md hover:bg-accent transition-colors
                            ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}
                        `}
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronRight size={14} />
                        )}
                    </button>

                    <div className="text-muted-foreground/70">
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
