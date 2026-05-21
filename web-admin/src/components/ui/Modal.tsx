// Modal Component - Pure Tailwind using React Portals
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'half' | '60p';
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true
}: ModalProps) {
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
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-7xl',
        half: 'w-full md:w-1/2 max-w-none',
        '60p': 'w-full md:w-[60%] max-w-none',
    };

    const modalContent = (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`
                    relative w-full ${sizes[size] || sizes.md}
                    bg-card/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border/80 overflow-hidden
                    transform transition-all duration-300 ease-out
                    animate-in fade-in zoom-in-95 slide-in-from-bottom-4
                    group flex flex-col max-h-[90vh]
                `}
            >
                {/* Subtle Visual Flourish */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />

                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="relative flex-none flex items-center justify-between p-6 border-b border-border bg-muted/30">
                        {title && (
                            <h3 className="text-xl font-bold text-foreground tracking-tight">
                                {title}
                            </h3>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-all duration-300 ml-auto flex items-center justify-center group/close"
                            >
                                <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="relative p-6 max-h-[70vh] overflow-y-auto global-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return modalContent; // Fallback if no modal-root div

    return createPortal(modalContent, modalRoot);
}
