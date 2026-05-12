// Rental Form - Pure Tailwind
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { rentalApi, type CreateRentalRequest, type RentalRate } from '../../api/rental';
import { clientApi } from '../../api/client-management';
import { assetApi } from '../../api/assets';
import {
    Button,
    Card,
    Select,
    DateInput,
    NumberInput,
    Textarea,
    LoadingOverlay,
    useToast,
    Modal,
    Input
} from '../../components/ui';
import { CreateClientModal } from '../../components/Clients/CreateClientModal';

// Simplified Asset Quick Add (Placeholder for now, or minimal fields)
// Ideally we reuse the AssetForm, but it's large. For "Quick Add" let's redirect or use a simple modal if crucial.
// For now, let's implement CreateClientModal integration fully.

export default function RentalForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const assetIdParam = searchParams.get('asset_id');

    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Modals
    const [showClientModal, setShowClientModal] = useState(false);
    const [showRateModal, setShowRateModal] = useState(false);

    // Rate Modal Form
    const [rateForm, setRateForm] = useState({
        name: '',
        rate_basis: 'hourly',
        rate_amount: 0,
        minimum_hours: 200,
        overtime_multiplier: 1.25,
        standby_multiplier: 0.50,
        breakdown_penalty_per_day: 0,
        hours_per_day: 8,
        days_per_month: 25,
        currency: 'IDR'
    });

    // Form State (Header)
    const [headerData, setHeaderData] = useState({
        client_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: undefined as string | undefined,
        deposit_amount: 0,
        notes: ''
    });

    // Items State
    interface RentalItemRow {
        tempId: string; // for key
        asset_id: string;
        asset_name: string;
        rental_rate_id: string;
        rate_name: string;
        rate_amount: number;
        rate_basis: string;
        notes?: string;
    }
    const [items, setItems] = useState<RentalItemRow[]>([]);

    // Current Item Addition State
    const [currentItem, setCurrentItem] = useState<{
        asset_id: string;
        rental_rate_id: string;
    }>({ asset_id: assetIdParam || '', rental_rate_id: '' });

    // Queries
    const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-list'],
        queryFn: () => clientApi.list({ limit: 100 }).then((res: any) => res.data)
    });
    const clients = clientsResponse?.data || [];

    const { data: assetsResponse, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets-available-rental'],
        queryFn: () => assetApi.list({ page: 1, per_page: 200, status: 'in_inventory' })
    });
    const assets = (assetsResponse?.data || []).filter((a: any) => a.is_rental === true && a.status === 'in_inventory');

    const { data: rateTemplates, isLoading: ratesLoading } = useQuery({
        queryKey: ['rental-rates'],
        queryFn: () => rentalApi.listRentalRates()
    });

    // Actions
    const handleAddItem = () => {
        if (!currentItem.asset_id || !currentItem.rental_rate_id) {
            showError('Select an asset and a rate template', 'Validation');
            return;
        }

        // Find details
        const asset = assets.find((a: any) => a.id === currentItem.asset_id);
        const rate = rateTemplates?.find((r: RentalRate) => r.id === currentItem.rental_rate_id);

        if (!asset || !rate) return;

        // Check duplicate
        if (items.some(i => i.asset_id === asset.id)) {
            showError('Asset already added to list', 'Validation');
            return;
        }

        setItems(prev => [...prev, {
            tempId: Math.random().toString(36).substr(2, 9),
            asset_id: asset.id,
            asset_name: `${asset.name} (${asset.asset_code})`,
            rental_rate_id: rate.id,
            rate_name: rate.name,
            rate_amount: rate.rate_amount,
            rate_basis: rate.rate_basis || 'hourly',
            notes: ''
        }]);

        // Reset current selection
        setCurrentItem({ asset_id: '', rental_rate_id: '' });
    };

    const handleRemoveItem = (tempId: string) => {
        setItems(prev => prev.filter(i => i.tempId !== tempId));
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: (values: CreateRentalRequest) => rentalApi.createRental(values),
        onSuccess: () => {
            success('Rental request created', 'Success');
            queryClient.invalidateQueries({ queryKey: ['rentals'] });
            navigate('/rentals');
        },
        onError: (err: any) => showError(err.response?.data?.message || 'Failed', 'Error')
    });

    const createRateMutation = useMutation({
        mutationFn: (data: any) => rentalApi.createRentalRate(data),
        onSuccess: (newRate: RentalRate) => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            success('Rate created', 'Success');
            setShowRateModal(false);
            setCurrentItem(prev => ({ ...prev, rental_rate_id: newRate.id }));
        },
        onError: (err: any) => showError(err.message, 'Error')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!headerData.client_id || !headerData.start_date) {
            showError('Client and Start Date required', 'Validation');
            return;
        }
        if (items.length === 0) {
            showError('Please add at least one asset', 'Validation');
            return;
        }

        const payload: CreateRentalRequest = {
            client_id: headerData.client_id,
            start_date: headerData.start_date,
            end_date: headerData.end_date,
            deposit_amount: Number(headerData.deposit_amount),
            notes: headerData.notes,
            items: items.map(i => ({
                asset_id: i.asset_id,
                rental_rate_id: i.rental_rate_id,
                rate_amount: i.rate_amount,
                notes: i.notes
            }))
        };
        createMutation.mutate(payload);
    };

    const isLoading = clientsLoading || assetsLoading || ratesLoading;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/rentals')}>
                    <ArrowLeft size={20} />
                </Button>
                <h1 className="text-2xl font-bold text-white">New Rental Request</h1>
            </div>

            <Card padding="lg">
                <LoadingOverlay visible={isLoading} />
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="Client"
                            placeholder="Select Client"
                            options={clients.map((c: any) => ({ value: c.id, label: c.name }))}
                            value={headerData.client_id}
                            onChange={(val) => setHeaderData(p => ({ ...p, client_id: val }))}
                            onCreate={() => setShowClientModal(true)}
                            required
                        />
                        <DateInput
                            label="Start Date"
                            value={headerData.start_date ? new Date(headerData.start_date) : null}
                            onChange={(d) => setHeaderData(p => ({ ...p, start_date: d ? d.toISOString().split('T')[0] : '' }))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DateInput
                            label="Expected End (Optional)"
                            value={headerData.end_date ? new Date(headerData.end_date) : null}
                            onChange={(d) => setHeaderData(p => ({ ...p, end_date: d ? d.toISOString().split('T')[0] : undefined }))}
                        />
                        <NumberInput
                            label="Deposit (Total)"
                            prefix="Rp "
                            value={headerData.deposit_amount}
                            onChange={(v) => setHeaderData(p => ({ ...p, deposit_amount: Number(v) }))}
                        />
                    </div>
                    <Textarea
                        label="General Notes"
                        rows={2}
                        value={headerData.notes}
                        onChange={e => setHeaderData(p => ({ ...p, notes: e.target.value }))}
                    />

                    <div className="w-full h-px bg-white/5 my-4" />

                    {/* Asset / Item Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Assets to Rent</h3>

                        {/* Selector Row */}
                        <div className="p-4 bg-gray-900/50 rounded-lg border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Select
                                label="Asset"
                                placeholder="Choose Asset"
                                options={assets.map((a: any) => ({ value: a.id, label: `${a.name} (${a.asset_code})` }))}
                                value={currentItem.asset_id}
                                onChange={(val) => setCurrentItem(p => ({ ...p, asset_id: val }))}
                            />
                            <Select
                                label="Rate Template"
                                placeholder="Choose Rate"
                                options={[
                                    { value: '__new__', label: '+ New Rate...' },
                                    ...(rateTemplates?.map((r: RentalRate) => ({
                                        value: r.id,
                                        label: `${r.name} (${r.currency} ${r.rate_amount})`
                                    })) || [])
                                ]}
                                value={currentItem.rental_rate_id}
                                onChange={(val) => {
                                    if (val === '__new__') setShowRateModal(true);
                                    else setCurrentItem(p => ({ ...p, rental_rate_id: val }));
                                }}
                            />
                            <Button type="button" onClick={handleAddItem} disabled={!currentItem.asset_id || !currentItem.rental_rate_id}>
                                + Add Asset
                            </Button>
                        </div>

                        {/* Items Table */}
                        {items.length > 0 ? (
                            <div className="overflow-x-auto border border-gray-700/50 rounded-lg">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-800 text-xs uppercase font-semibold text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3">Asset</th>
                                            <th className="px-4 py-3">Rate</th>
                                            <th className="px-4 py-3">Price</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {items.map(item => (
                                            <tr key={item.tempId} className="hover:bg-gray-800/30">
                                                <td className="px-4 py-3 font-medium text-white">{item.asset_name}</td>
                                                <td className="px-4 py-3">{item.rate_name}</td>
                                                <td className="px-4 py-3 font-mono">
                                                    Rp {item.rate_amount.toLocaleString()} <span className="text-xs text-slate-500">/{item.rate_basis}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.tempId)}
                                                        className="text-red-400 hover:text-red-300 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-lg">
                                No assets added yet. Use the form above to add an asset.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="ghost" onClick={() => navigate('/rentals')} type="button"> Cancel </Button>
                        <Button type="submit" leftIcon={<Save size={16} />} loading={createMutation.isPending}>
                            Submit Rental Request
                        </Button>
                    </div>
                </form>
            </Card>

            <CreateClientModal
                isOpen={showClientModal}
                onClose={() => setShowClientModal(false)}
                onSuccess={(newId) => setHeaderData(p => ({ ...p, client_id: newId }))}
            />

            {/* Rate Modal - Simplified reuse */}
            <Modal
                isOpen={showRateModal}
                onClose={() => setShowRateModal(false)}
                title="Create New Rate"
                size="lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); createRateMutation.mutate({ ...rateForm, rate_type: rateForm.rate_basis }); }} className="space-y-4">
                    <Input label="Name" required value={rateForm.name} onChange={e => setRateForm(p => ({ ...p, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Basis" options={[{ value: 'hourly', label: 'Hourly' }, { value: 'monthly', label: 'Monthly' }, { value: 'daily', label: 'Daily' }, { value: 'bcm', label: 'BCM' }]}
                            value={rateForm.rate_basis} onChange={v => setRateForm(p => ({ ...p, rate_basis: v }))}
                        />
                        <NumberInput label="Amount" prefix="Rp " required value={rateForm.rate_amount} onChange={v => setRateForm(p => ({ ...p, rate_amount: Number(v) }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <NumberInput label="Min Hrs" value={rateForm.minimum_hours} onChange={v => setRateForm(p => ({ ...p, minimum_hours: Number(v) }))} />
                        <NumberInput label="Standby x" value={rateForm.standby_multiplier} onChange={v => setRateForm(p => ({ ...p, standby_multiplier: Number(v) }))} />
                        <NumberInput label="Overtime x" value={rateForm.overtime_multiplier} onChange={v => setRateForm(p => ({ ...p, overtime_multiplier: Number(v) }))} />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" loading={createRateMutation.isPending}>Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
