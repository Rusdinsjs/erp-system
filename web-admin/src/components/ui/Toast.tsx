// Toast/Notification System - Pure Tailwind
import { createContext, useContext, useState, type ReactNode, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Toast Types
interface Toast {
    id: string;
    title?: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Event Emitter for usage outside React components
class ToastEmitter extends EventTarget {
    emit(toast: Omit<Toast, 'id'>) {
        this.dispatchEvent(new CustomEvent('toast', { detail: toast }));
    }
}
export const toastEmitter = new ToastEmitter();

// Helper to show toasts from anywhere (e.g. axios interceptors)
export const showToast = (message: string, type: Toast['type'] = 'info', title?: string, duration?: number) => {
    toastEmitter.emit({ message, type, title, duration });
};

// Toast Provider
interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Listen for external toast events
    useEffect(() => {
        const handleExternalToast = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            addToast(detail);
        };

        toastEmitter.addEventListener('toast', handleExternalToast);
        return () => {
            toastEmitter.removeEventListener('toast', handleExternalToast);
        };
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
}

// Toast Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }

    return {
        toast: context.addToast,
        success: (message: string, title?: string) =>
            context.addToast({ message, title, type: 'success' }),
        error: (message: string, title?: string) =>
            context.addToast({ message, title, type: 'error' }),
        warning: (message: string, title?: string) =>
            context.addToast({ message, title, type: 'warning' }),
        info: (message: string, title?: string) =>
            context.addToast({ message, title, type: 'info' }),
    };
}

// Toast Container
function ToastContainer() {
    const context = useContext(ToastContext);
    if (!context) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
            {context.toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => context.removeToast(toast.id)} />
            ))}
        </div>
    );
}

// Toast Item
interface ToastItemProps {
    toast: Toast;
    onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
    const icons = {
        success: <CheckCircle size={20} className="text-emerald-400" />,
        error: <AlertCircle size={20} className="text-red-400" />,
        warning: <AlertTriangle size={20} className="text-amber-400" />,
        info: <Info size={20} className="text-cyan-400" />,
    };

    const borders = {
        success: 'border-l-emerald-500',
        error: 'border-l-red-500',
        warning: 'border-l-amber-500',
        info: 'border-l-cyan-500',
    };

    return (
        <div
            className={`
                flex items-start gap-3 p-4 
                bg-slate-900 border border-slate-800 border-l-4 ${borders[toast.type]}
                rounded-xl shadow-xl
                animate-in slide-in-from-right fade-in duration-300
            `}
        >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className="font-medium text-white text-sm">{toast.title}</p>
                )}
                <p className="text-sm text-slate-400">{toast.message}</p>
            </div>
            <button
                onClick={onClose}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}
