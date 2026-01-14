// BillingPeriodForm component
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../api/timesheet';
import type { CreateBillingRequest } from '../../api/timesheet';
import { Button, Input, Select, useToast } from '../ui';

interface Props {
    rentalId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function BillingPeriodForm({ rentalId, onClose, onSuccess }: Props) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState<Partial<CreateBillingRequest>>({
        rental_id: rentalId,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        period_type: 'daily'
    });

    const mutation = useMutation({
        mutationFn: (data: CreateBillingRequest) => billingApi.create(data),
        onSuccess: () => {
            success('Billing period created successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['billing', rentalId] });
            onSuccess();
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to create billing period', 'Error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.period_start || !formData.period_end) return;

        mutation.mutate({
            rental_id: rentalId,
            period_start: formData.period_start,
            period_end: formData.period_end,
            period_type: formData.period_type
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Period Start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                />
                <Input
                    label="Period End"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                />
            </div>

            <Select
                label="Period Type"
                value={formData.period_type}
                onChange={(val) => setFormData({ ...formData, period_type: val })}
                options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Bi-Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                ]}
            />

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" type="button" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit" loading={mutation.isPending}>
                    Generate Period
                </Button>
            </div>
        </form>
    );
}
