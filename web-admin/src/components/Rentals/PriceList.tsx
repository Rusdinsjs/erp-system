// PriceList - Pure Tailwind
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash } from 'lucide-react';
import { rentalApi, type RentalRate } from '../../api/rental';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    Button, Badge, ActionIcon, Modal, Input, NumberInput, Select,
    LoadingOverlay, useToast
} from '../ui';

interface PriceFormState {
    name: string;
    rate_basis: string;
    rate_amount: number | '';
    minimum_hours: number;
    overtime_multiplier: number;
    standby_multiplier: number;
    breakdown_penalty_per_day: number;
    hours_per_day: number;
    days_per_month: number;
    currency: string;
    fuel_surcharge_rate: number;
}

const initialFormState: PriceFormState = {
    name: '',
    rate_basis: 'hourly',
    rate_amount: '',
    minimum_hours: 200,
    overtime_multiplier: 1.25,
    standby_multiplier: 0.50,
    breakdown_penalty_per_day: 0,
    hours_per_day: 8,
    days_per_month: 25,
    currency: 'IDR',
    fuel_surcharge_rate: 0
};

export function PriceList() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [opened, setOpened] = useState(false);
    const [editingRate, setEditingRate] = useState<RentalRate | null>(null);
    const [form, setForm] = useState<PriceFormState>(initialFormState);

    const { data: rates, isLoading } = useQuery({
        queryKey: ['rental-rates'],
        queryFn: () => rentalApi.listRentalRates()
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => rentalApi.createRentalRate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            success('Price item added', 'Success');
            setOpened(false);
        },
        onError: (err: any) => showError(err.message, 'Error')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => rentalApi.updateRentalRate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            success('Price template updated', 'Success');
            setOpened(false);
            setEditingRate(null);
        },
        onError: (err: any) => showError(err.message, 'Error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => rentalApi.deleteRentalRate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-rates'] });
            success('Price template deleted', 'Success');
        },
        onError: (err: any) => showError(err.message, 'Error')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            rate_amount: Number(form.rate_amount),
            rate_type: form.rate_basis
        };

        if (editingRate) {
            updateMutation.mutate({ id: editingRate.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleEdit = (rate: RentalRate) => {
        setEditingRate(rate);
        setForm({
            name: rate.name,
            rate_basis: rate.rate_basis || 'hourly',
            rate_amount: Number(rate.rate_amount) || 0,
            minimum_hours: Number(rate.minimum_hours) || 200,
            overtime_multiplier: Number(rate.overtime_multiplier) || 1.25,
            standby_multiplier: Number(rate.standby_multiplier) || 0.50,
            breakdown_penalty_per_day: Number(rate.breakdown_penalty_per_day) || 0,
            hours_per_day: Number(rate.hours_per_day) || 8,
            days_per_month: Number(rate.days_per_month) || 25,
            currency: rate.currency || 'IDR',
            fuel_surcharge_rate: Number(rate.fuel_surcharge_rate) || 0
        });
        setOpened(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this price template?')) {
            deleteMutation.mutate(id);
        }
    };

    const updateField = (key: keyof PriceFormState, val: any) => {
        setForm(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-muted/10">
                <h4 className="text-lg font-bold text-foreground">Standard Price Templates</h4>
                <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => {
                    setEditingRate(null);
                    setForm(initialFormState);
                    setOpened(true);
                }} className="rounded-xl shadow-lg shadow-primary/20">
                    Add template
                </Button>
            </div>

            <div className="relative flex-1">
                <LoadingOverlay visible={isLoading} />
                <Table className="border-none rounded-none shadow-none">
                    <TableHead>
                        <TableRow className="bg-muted/50 border-border">
                            <TableTh>Template Name</TableTh>
                            <TableTh>Basis</TableTh>
                            <TableTh>Rate (IDR)</TableTh>
                            <TableTh>Min Hours</TableTh>
                            <TableTh>Overtime</TableTh>
                            <TableTh>Standby</TableTh>
                            <TableTh align="center" className="w-24">Action</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rates?.map((rate: RentalRate) => (
                            <TableRow key={rate.id} className="hover:bg-muted/30 border-border group transition-all">
                                <TableTd className="font-medium text-foreground">{rate.name}</TableTd>
                                <TableTd>
                                    <Badge variant="default" className="bg-muted/20 border-border text-muted-foreground capitalize">
                                        {rate.rate_basis}
                                    </Badge>
                                </TableTd>
                                <TableTd className="font-bold text-emerald-500">Rp {Number(rate.rate_amount).toLocaleString('id-ID')}</TableTd>
                                <TableTd className="text-muted-foreground">{rate.minimum_hours}h / mo</TableTd>
                                <TableTd className="text-muted-foreground">{((rate.overtime_multiplier || 1) * 100).toFixed(0)}%</TableTd>
                                <TableTd className="text-muted-foreground">{((rate.standby_multiplier || 0) * 100).toFixed(0)}%</TableTd>
                                <TableTd align="center">
                                    <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ActionIcon className="hover:bg-primary/20 text-primary" onClick={() => handleEdit(rate)}>
                                            <Edit size={16} />
                                        </ActionIcon>
                                        <ActionIcon
                                            className="hover:bg-destructive/20 text-destructive"
                                            onClick={() => handleDelete(rate.id)}
                                        >
                                            <Trash size={16} />
                                        </ActionIcon>
                                    </div>
                                </TableTd>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!rates?.length && !isLoading && (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                        <Plus size={48} className="mb-4 opacity-20" />
                        <p>No price templates defined</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={opened}
                onClose={() => setOpened(false)}
                title={editingRate ? "Edit Price Template" : "Create New Price Template"}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Template Name"
                        placeholder="e.g. Excavator PC200 Standard (200h)"
                        required
                        value={form.name}
                        onChange={e => updateField('name', e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Rate Basis"
                            options={[
                                { value: 'hourly', label: 'Hourly' },
                                { value: 'daily', label: 'Daily' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'bcm', label: 'BCM (Volume Based)' }
                            ]}
                            value={form.rate_basis}
                            onChange={val => updateField('rate_basis', val)}
                        />
                        <NumberInput
                            label="Rate Amount"
                            prefix="Rp "
                            required
                            value={form.rate_amount}
                            onChange={val => updateField('rate_amount', val)}
                        />
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-muted text-muted-foreground">Contract Rules (Billing Automation)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <NumberInput
                            label="Min Hours/Month"
                            hint="Guaranteed billing"
                            value={form.minimum_hours}
                            onChange={val => updateField('minimum_hours', val)}
                        />
                        <NumberInput
                            label="Overtime Mult."
                            hint="e.g. 1.25"
                            step={0.05}
                            value={form.overtime_multiplier}
                            onChange={val => updateField('overtime_multiplier', val)}
                        />
                        <NumberInput
                            label="Standby Mult."
                            hint="e.g. 0.5"
                            step={0.05}
                            value={form.standby_multiplier}
                            onChange={val => updateField('standby_multiplier', val)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <NumberInput
                                label="Penalty / Day"
                                prefix="Rp "
                                value={form.breakdown_penalty_per_day}
                                onChange={val => updateField('breakdown_penalty_per_day', val)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <NumberInput
                                label="Fuel Surcharge / L"
                                prefix="Rp "
                                value={form.fuel_surcharge_rate}
                                onChange={val => updateField('fuel_surcharge_rate', val)}
                            />
                        </div>
                        <NumberInput
                            label="Hrs/Day"
                            value={form.hours_per_day}
                            onChange={val => updateField('hours_per_day', val)}
                        />
                        <NumberInput
                            label="Days/Mo"
                            value={form.days_per_month}
                            onChange={val => updateField('days_per_month', val)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setOpened(false)}>Cancel</Button>
                        <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                            {editingRate ? "Update Template" : "Save Template"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
