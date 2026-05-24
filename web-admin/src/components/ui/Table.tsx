// Table Component - Pure Tailwind
import { type ReactNode } from 'react';

// Table Root
interface TableProps {
    children: ReactNode;
    className?: string;
}

export function Table({ children, className = '' }: TableProps) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border shadow-md">
            <table className={`w-full text-sm ${className}`}>
                {children}
            </table>
        </div>
    );
}

// Table Head
interface TableHeadProps {
    children: ReactNode;
    className?: string;
}

export function TableHead({ children, className = '' }: TableHeadProps) {
    return (
        <thead className={`bg-muted/50 border-b border-border ${className}`}>
            {children}
        </thead>
    );
}

// Table Body
interface TableBodyProps {
    children: ReactNode;
    className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
    return <tbody className={`divide-y divide-border/50 ${className}`}>{children}</tbody>;
}

// Table Row
interface TableRowProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}

export function TableRow({ children, onClick, className = '' }: TableRowProps) {
    return (
        <tr
            className={`
                bg-card/30 hover:bg-muted/50 transition-colors
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

// Table Header Cell
interface TableThProps {
    children: ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
    onClick?: () => void;
}

export function TableTh({ children, className = '', align = 'left', onClick }: TableThProps) {
    const alignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <th
            className={`px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs ${alignClass[align]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            {children}
        </th>
    );
}

// Table Data Cell
interface TableTdProps {
    children: ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
    colSpan?: number;
}

export function TableTd({ children, className = '', align = 'left', colSpan }: TableTdProps) {
    const alignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <td
            className={`px-4 py-3 text-foreground ${alignClass[align]} ${className}`}
            colSpan={colSpan}
        >
            {children}
        </td>
    );
}

// Empty State
interface TableEmptyProps {
    colSpan: number;
    message?: string;
}

export function TableEmpty({ colSpan, message = 'No data found' }: TableEmptyProps) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                {message}
            </td>
        </tr>
    );
}
