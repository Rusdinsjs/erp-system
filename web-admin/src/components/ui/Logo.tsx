import React from 'react';

interface LogoProps {
    collapsed?: boolean;
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ collapsed, className = "" }) => {
    return (
        <div className={`flex items-center gap-3 transition-all duration-300 ${className}`}>
            {/* SJS Icon Container */}
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 shadow-lg shadow-blue-500/10">
                    <img
                        src="/logo-sjs.png"
                        alt="SJS Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full -z-10" />
            </div>

            {/* SJS Text branding - only shown if not collapsed */}
            {!collapsed && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                    <span className="text-xl font-black text-white leading-none tracking-tight">
                        SJS Group
                    </span>
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-[0.2em] mt-0.5 whitespace-nowrap">
                        Management System
                    </span>
                </div>
            )}
        </div>
    );
};
