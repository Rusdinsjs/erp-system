import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { contractApi } from '../../api/contract';
import { clientApi } from '../../api/client-management';
import { contractTemplateApi } from '../../api/contractTemplate';
import type { CreateContractRequest, Contract } from '../../types/contract';
import type { ContractTemplate } from '../../types/contractTemplate';

interface ContractFormProps {
    onClose: () => void;
    onSuccess: () => void;
    contract?: Contract; // Optional: for edit mode
}

const ContractForm: React.FC<ContractFormProps> = ({ onClose, onSuccess, contract }) => {
    const isEditMode = !!contract;

    const [formData, setFormData] = useState<CreateContractRequest>({
        client_id: '',
        start_date: '',
        end_date: '',
        template_id: '',
        payment_terms: 'NET_30',
        auto_renew: false,
        price_lock: true,
        notes: ''
    });

    // Populate form data when editing
    useEffect(() => {
        if (contract) {
            setFormData({
                client_id: contract.client_id,
                start_date: contract.start_date,
                end_date: contract.end_date,
                payment_terms: contract.payment_terms,
                auto_renew: contract.auto_renew,
                price_lock: contract.price_lock,
                notes: contract.notes || ''
            });
        }
    }, [contract]);

    // Fetch clients for dropdown
    const { data: clientsResponse } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list({ limit: 100 })
    });

    // Fetch templates for dropdown
    const { data: templates } = useQuery({
        queryKey: ['contract-templates'],
        queryFn: () => contractTemplateApi.getAll()
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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreateContractRequest }) =>
            contractApi.update(id, data),
        onSuccess: () => {
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && contract) {
            updateMutation.mutate({ id: contract.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {isEditMode ? 'Edit Contract' : 'Create New Contract'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isEditMode ? 'Update contract terms and details' : 'Define terms for a new rental agreement'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client Selection */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Client</label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none"
                                >
                                    <option value="" className="bg-card text-muted-foreground">Select a Client</option>
                                    {clients.map((client: any) => (
                                        <option key={client.id} value={client.id} className="bg-card">
                                            {client.name} ({client.client_code})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-muted-foreground">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Template Selection */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Contract Template</label>
                            <div className="relative">
                                <select
                                    value={formData.template_id}
                                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none"
                                >
                                    <option value="" className="bg-card text-muted-foreground">Default (No Template)</option>
                                    {templates?.map((template: ContractTemplate) => (
                                        <option key={template.id} value={template.id} className="bg-card">
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-muted-foreground">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Start Date</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">End Date</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all [color-scheme:dark]"
                            />
                        </div>

                        {/* Terms */}
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Payment Terms</label>
                            <div className="relative">
                                <select
                                    value={formData.payment_terms}
                                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none"
                                >
                                    <option value="NET_30" className="bg-card">Net 30 Days</option>
                                    <option value="NET_45" className="bg-card">Net 45 Days</option>
                                    <option value="NET_60" className="bg-card">Net 60 Days</option>
                                    <option value="COD" className="bg-card">Cash on Delivery</option>
                                    <option value="PREPAID" className="bg-card">Prepaid</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-muted-foreground">
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
                                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">Auto Renew</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.price_lock}
                                        onChange={(e) => setFormData({ ...formData, price_lock: e.target.checked })}
                                        className="peer sr-only"
                                    />
                                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                                <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">Price Lock</span>
                            </label>
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder-muted-foreground resize-none"
                                placeholder="Additional terms or notes..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 shadow-lg shadow-[0_0_15px_rgba(var(--primary),0.2)] 
                                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Save size={18} />
                            {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Contract' : 'Create Contract')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
