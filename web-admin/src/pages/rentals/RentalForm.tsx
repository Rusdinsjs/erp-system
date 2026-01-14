// Rental Form - Pure Tailwind
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    useToast
} from '../../components/ui';

export function RentalForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Form State
    const [formData, setFormData] = useState<CreateRentalRequest>({
        client_id: '',
        asset_id: '',
        rental_rate_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: undefined,
        daily_rate: 0,
        deposit_amount: 0,
        notes: ''
    });

    const handleChange = (field: keyof CreateRentalRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Fetch Clients
    const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-list'],
        queryFn: () => clientApi.list({ limit: 100 }).then(res => res.data)
    });
    const clients = clientsResponse?.data || [];

    // Fetch Available Assets
    const { data: assetsResponse, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets-available'],
        queryFn: () => assetApi.list({ page: 1, per_page: 100, status: 'available' })
    });
    const assets = assetsResponse?.data || [];

    // Fetch Rate Templates
    const { data: rateTemplates, isLoading: ratesLoading } = useQuery({
        queryKey: ['rental-rates'],
        queryFn: () => rentalApi.listRentalRates()
    });

    // Auto-populate rate details on template selection
    const handleTemplateChange = (rateId: string) => {
        const template = rateTemplates?.find((r: RentalRate) => r.id === rateId);
        setFormData(prev => ({
            ...prev,
            rental_rate_id: rateId || undefined,
            daily_rate: template?.rate_amount || prev.daily_rate // Only update if template found, else keep or reset? Maybe keep.
        }));
    };

    const createMutation = useMutation({
        mutationFn: (values: CreateRentalRequest) => rentalApi.createRental(values),
        onSuccess: () => {
            success('Rental request created successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['rentals'] });
            navigate('/rentals');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to create rental', 'Error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.client_id || !formData.asset_id || !formData.start_date) {
            showError('Please fill in all required fields', 'Validation Error');
            return;
        }

        const payload = { ...formData };
        if (!payload.end_date) delete payload.end_date;
        if (!payload.rental_rate_id) delete payload.rental_rate_id;

        // Ensure daily_rate and deposit_amount are numbers
        payload.daily_rate = Number(payload.daily_rate);
        payload.deposit_amount = Number(payload.deposit_amount);

        createMutation.mutate(payload);
    };

    const isLoading = clientsLoading || assetsLoading || ratesLoading;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/rentals')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">New Rental Request</h1>
                </div>
            </div>

            <Card padding="lg" className="relative">
                <LoadingOverlay visible={isLoading} />

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="Client"
                            placeholder="Select Client"
                            options={clients.map((c) => ({ value: c.id, label: c.name + (c.company_name ? ` (${c.company_name})` : '') }))}
                            value={formData.client_id}
                            onChange={(val) => handleChange('client_id', val)}
                            required
                        />
                        <Select
                            label="Asset to Rent"
                            placeholder="Select Available Asset"
                            options={assets.map((a) => ({ value: a.id, label: `${a.name} (${a.asset_code})` }))}
                            value={formData.asset_id}
                            onChange={(val) => handleChange('asset_id', val)}
                            required
                        />
                    </div>

                    <div className="w-full h-px bg-slate-800" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Schedule & Pricing</h3>

                    {/* Schedule */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DateInput
                            label="Start Date"
                            placeholder="Pick date"
                            value={formData.start_date ? new Date(formData.start_date) : null}
                            onChange={(date) => handleChange('start_date', date ? date.toISOString().split('T')[0] : '')}
                            required
                        />
                        <DateInput
                            label="Expected End Date"
                            placeholder="Open-ended if empty"
                            value={formData.end_date ? new Date(formData.end_date) : null}
                            onChange={(date) => handleChange('end_date', date ? date.toISOString().split('T')[0] : undefined)}
                        />
                    </div>

                    {/* Pricing */}
                    <div className="space-y-6">
                        <Select
                            label="Apply Price Template (Optional)"
                            placeholder="Select a standard rate..."
                            options={rateTemplates?.map((r: RentalRate) => ({
                                value: r.id,
                                label: `${r.name} - ${r.rate_amount.toLocaleString()} ${r.currency} / ${r.rate_basis || 'Day'}`
                            })) || []}
                            value={formData.rental_rate_id || ''}
                            onChange={handleTemplateChange}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="Base Rate Amount"
                                placeholder="0"
                                prefix="Rp "
                                value={formData.daily_rate}
                                onChange={(val) => handleChange('daily_rate', val)}
                                required
                            />
                            <NumberInput
                                label="Deposit Amount"
                                placeholder="0"
                                prefix="Rp "
                                value={formData.deposit_amount}
                                onChange={(val) => handleChange('deposit_amount', val)}
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-800" />

                    <Textarea
                        label="Notes"
                        placeholder="Special conditions, delivery instructions, etc."
                        rows={3}
                        value={formData.notes || ''}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => navigate('/rentals')} type="button">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            leftIcon={<Save size={16} />}
                            loading={createMutation.isPending}
                        >
                            Create Request
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
