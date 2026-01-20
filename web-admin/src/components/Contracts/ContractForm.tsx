import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { contractApi } from '../../api/contract';
import { clientApi } from '../../api/client-management';
import type { CreateContractRequest } from '../../types/contract';

interface ContractFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ContractForm: React.FC<ContractFormProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState<CreateContractRequest>({
        client_id: '',
        start_date: '',
        end_date: '',
        payment_terms: 'NET_30',
        auto_renew: false,
        price_lock: true,
        notes: ''
    });

    // Fetch clients for dropdown
    const { data: clientsResponse } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list({ limit: 100 })
    });

    // Extract clients array from nested response structure
    // api.list returns AxiosResponse<PaginatedResponse<Client>>
    const clients = clientsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: contractApi.create,
        onSuccess: () => {
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700/50 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-700/50 sticky top-0 bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Create New Contract</h2>
                        <p className="text-sm text-gray-400 mt-1">Define terms for a new rental agreement</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client Selection */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                                >
                                    <option value="" className="bg-gray-800 text-gray-400">Select a Client</option>
                                    {clients.map((client: any) => (
                                        <option key={client.id} value={client.id} className="bg-gray-800">
                                            {client.name} ({client.client_code})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [color-scheme:dark]"
                            />
                        </div>

                        {/* Terms */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
                            <div className="relative">
                                <select
                                    value={formData.payment_terms}
                                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                                >
                                    <option value="NET_30" className="bg-gray-800">Net 30 Days</option>
                                    <option value="NET_45" className="bg-gray-800">Net 45 Days</option>
                                    <option value="NET_60" className="bg-gray-800">Net 60 Days</option>
                                    <option value="COD" className="bg-gray-800">Cash on Delivery</option>
                                    <option value="PREPAID" className="bg-gray-800">Prepaid</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col justify-end space-y-4 py-2">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.auto_renew}
                                        onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                                        className="peer sr-only"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Auto Renew</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.price_lock}
                                        onChange={(e) => setFormData({ ...formData, price_lock: e.target.checked })}
                                        className="peer sr-only"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-gray-300 font-medium group-hover:text-white transition-colors">Price Lock</span>
                            </label>
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-600 resize-none"
                                placeholder="Additional terms or notes..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-700/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 shadow-lg shadow-blue-500/20 
                                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Save size={18} />
                            {createMutation.isPending ? 'Creating...' : 'Create Contract'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
