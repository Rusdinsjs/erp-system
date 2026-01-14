// Table Component - Pure Tailwind
import { type ReactNode } from 'react';

// Table Root
interface TableProps {
    children: ReactNode;
    className?: string;
}

export function Table({ children, className = '' }: TableProps) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className={`w-full text-sm ${className}`}>
                {children}
            </table>
        </div>
    );
}

// Table Head
interface TableHeadProps {
    children: ReactNode;
}

export function TableHead({ children }: TableHeadProps) {
    return (
        <thead className="bg-slate-900/50 border-b border-slate-800">
            {children}
        </thead>
    );
}

// Table Body
interface TableBodyProps {
    children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
    return <tbody className="divide-y divide-slate-800">{children}</tbody>;
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
                bg-slate-950/30 hover:bg-slate-800/50 transition-colors
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
}

export function TableTh({ children, className = '', align = 'left' }: TableThProps) {
    const alignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <th className={`px-4 py-3 font-semibold text-slate-300 ${alignClass[align]} ${className}`}>
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
            className={`px-4 py-3 text-slate-200 ${alignClass[align]} ${className}`}
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
            <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
                {message}
            </td>
        </tr>
    );
}
