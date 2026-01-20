import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock, FileText } from 'lucide-react';
import { contractApi } from '../api/contract'
import type { Contract } from '../types/contract';
import ContractForm from '../components/Contracts/ContractForm';
import { Card } from '../components/ui';
import { format } from 'date-fns';

const ContractList: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Fetch contracts
    const { data: contracts = [], isLoading, refetch } = useQuery({
        queryKey: ['contracts'],
        queryFn: () => contractApi.list()
    });

    // Fetch expiring contracts
    const { data: expiringContracts = [] } = useQuery({
        queryKey: ['contracts', 'expiring'],
        queryFn: () => contractApi.listExpiring()
    });

    const filteredContracts = (contracts as Contract[]).filter((c: Contract) => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'expiring') return (expiringContracts as Contract[]).some((ec: Contract) => ec.id === c.id);
        return c.status === filterStatus;
    });



    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Contract Management</h1>
                    <p className="text-gray-400 mt-2">Monitor rental agreements, performance, and renewals.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 
                             flex items-center gap-2 transition-all duration-200 font-medium"
                >
                    <Plus size={20} />
                    New Contract
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Active Contracts Card */}
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Active Contracts</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {(contracts as Contract[]).filter((c: Contract) => c.status === 'active').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-xl">
                            <CheckCircle className="text-green-400" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Currently operational
                    </div>
                </Card>

                {/* Expiring Soon Card */}
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Expiring Soon</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {(expiringContracts as Contract[]).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Clock className="text-yellow-400" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-400">
                        Requires attention this month
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0">
                {/* Filters Bar */}
                <div className="p-4 border-b border-white/5 flex gap-2 overflow-x-auto">
                    {['all', 'active', 'draft', 'expiring', 'expired'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors duration-200
                                ${filterStatus === status
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Contracts Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Contract Number</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Terms</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-4 w-48 bg-gray-700 rounded mb-2"></div>
                                            <div className="h-3 w-32 bg-gray-700/50 rounded"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="bg-gray-700/50 p-4 rounded-full mb-3">
                                                <FileText size={32} />
                                            </div>
                                            <p className="text-lg font-medium text-gray-300">No contracts found</p>
                                            <p className="text-sm">Try adjusting your filters or create a new contract.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract: Contract) => (
                                    <tr
                                        key={contract.id}
                                        className="hover:bg-gray-700/30 transition-colors duration-150 cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                                                {contract.contract_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-200">
                                                {contract.client_name || 'Unknown Client'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-400">
                                                <span className="text-gray-300">{format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
                                                <span className="mx-2 text-gray-600">→</span>
                                                <span className="text-gray-300">{format(new Date(contract.end_date), 'MMM d, yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${contract.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                contract.status === 'draft' ? 'bg-gray-700 text-gray-300 border-gray-600' :
                                                    contract.status === 'expiring' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        contract.status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {contract.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {contract.payment_terms.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <ContractForm
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
};

export default ContractList;
