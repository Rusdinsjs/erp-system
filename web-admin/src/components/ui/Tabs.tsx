// Tabs Component - Pure Tailwind
import { type ReactNode, createContext, useContext, useState } from 'react';

// Context for tabs
interface TabsContextValue {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

// Tabs Root
interface TabsProps {
    children: ReactNode;
    defaultValue: string;
    className?: string;
}

export function Tabs({ children, defaultValue, className = '' }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

// Tabs List
interface TabsListProps {
    children: ReactNode;
    className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
    return (
        <div
            className={`
                flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// Tab Trigger
interface TabsTriggerProps {
    children: ReactNode;
    value: string;
    icon?: ReactNode;
    className?: string;
}

export function TabsTrigger({ children, value, icon, className = '' }: TabsTriggerProps) {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const { activeTab, setActiveTab } = context;
    const isActive = activeTab === value;

    return (
        <button
            type="button"
            onClick={() => setActiveTab(value)}
            className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200
                ${isActive
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
                ${className}
            `}
        >
            {icon}
            {children}
        </button>
    );
}

// Tab Content
interface TabsContentProps {
    children: ReactNode;
    value: string;
    className?: string;
}

export function TabsContent({ children, value, className = '' }: TabsContentProps) {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');

    if (context.activeTab !== value) return null;

    return <div className={`mt-4 ${className}`}>{children}</div>;
}
