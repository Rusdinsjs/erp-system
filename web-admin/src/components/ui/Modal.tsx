// Modal Component - Pure Tailwind using React Portals
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
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
                    bg-gray-800 rounded-2xl shadow-2xl border border-white/5 overflow-hidden
                    transform transition-all duration-300 ease-out
                    animate-in fade-in zoom-in-95 slide-in-from-bottom-4
                    group
                `}
            >
                {/* Subtle Visual Flourish */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-700" />

                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="relative flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                        {title && (
                            <h3 className="text-xl font-bold text-white tracking-tight">
                                {title}
                            </h3>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all duration-300 ml-auto flex items-center justify-center group/close"
                            >
                                <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="relative p-6 max-h-[85vh] overflow-y-auto global-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return modalContent; // Fallback if no modal-root div

    return createPortal(modalContent, modalRoot);
}
