// Drawer Component - Pure Tailwind (Slide-in Panel)
import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    position?: 'left' | 'right';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Drawer({
    isOpen,
    onClose,
    title,
    children,
    position = 'right',
    size = 'md'
}: DrawerProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-2xl',
    };

    const positionClasses = position === 'right'
        ? 'right-0 animate-slide-in-right'
        : 'left-0 animate-slide-in-left';

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={`
                    absolute top-0 bottom-0 ${positionClasses}
                    w-full ${sizes[size]}
                    bg-slate-900 border-l border-slate-800 shadow-2xl
                    flex flex-col
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
                    {title && (
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
