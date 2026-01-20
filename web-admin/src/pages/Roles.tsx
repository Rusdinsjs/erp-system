import { useState } from 'react';
import { Shield, Settings } from 'lucide-react';
import { Card } from '../components/ui';
import { RolePermissionsMatrix } from '../components/Admin/RolePermissionsMatrix';

type TabType = 'overview' | 'permissions';

export function Roles() {
    const [activeTab, setActiveTab] = useState<TabType>('permissions');

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Role Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage roles and their permissions
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Card padding="none">
                <div className="border-b border-slate-700">
                    <nav className="flex gap-4 px-6">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                    ? 'border-cyan-500 text-cyan-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Shield size={16} />
                                <span>Roles Overview</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'permissions'
                                    ? 'border-cyan-500 text-cyan-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Settings size={16} />
                                <span>Permission Matrix</span>
                            </div>
                        </button>
                    </nav>
                </div>
            </Card>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <Card padding="lg">
                    <div className="text-slate-400">
                        <h3 className="text-lg font-semibold text-white mb-4">Roles Overview</h3>
                        <p className="text-sm">
                            The roles system defines different levels of access in the application.
                            Each role has a level (1-5) and a set of permissions.
                        </p>
                        <div className="mt-4 space-y-3">
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="font-medium text-white">Super Admin (Level 1)</div>
                                <div className="text-xs mt-1">Full system access - all permissions</div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="font-medium text-white">Manager (Level 2)</div>
                                <div className="text-xs mt-1">Approval L2, Asset Management</div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="font-medium text-white">Supervisor (Level 3)</div>
                                <div className="text-xs mt-1">Approval L1, Operational View</div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="font-medium text-white">Admin (Level 4)</div>
                                <div className="text-xs mt-1">Organization Management</div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded-lg">
                                <div className="font-medium text-white">Staff/Technician (Level 5)</div>
                                <div className="text-xs mt-1">Limited access to specific resources</div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'permissions' && <RolePermissionsMatrix />}
        </div>
    );
}
