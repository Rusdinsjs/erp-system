import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings';

interface LogoProps {
    collapsed?: boolean;
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ collapsed, className = "" }) => {
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: settingsApi.getPublic
    });

    const appName = publicSettings?.app_name || 'Management System';
    const companyLogo = publicSettings?.company_logo;
    const companyName = publicSettings?.company_name || 'SJS Group';

    return (
        <div className={`flex items-center gap-3 transition-all duration-300 ${className}`}>
            {/* Logo Icon Container */}
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 shadow-lg shadow-blue-500/10 overflow-hidden">
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt={companyName}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white font-bold">
                            {companyName.charAt(0)}
                        </div>
                    )}
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full -z-10" />
            </div>

            {/* Branding Text - only shown if not collapsed */}
            {!collapsed && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                    <span className="text-xl font-black text-white leading-none tracking-tight">
                        {companyName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-[0.2em] mt-0.5 whitespace-nowrap">
                        {appName}
                    </span>
                </div>
            )}
        </div>
    );
};
