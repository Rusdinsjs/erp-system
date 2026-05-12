import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { clientApi } from '../../api/client-management';
import { Modal, Button, Input, Textarea, useToast } from '../ui';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newClientId: string) => void;
}

export function CreateClientModal({ isOpen, onClose, onSuccess }: CreateClientModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        client_code: '',
        name: '',
        company_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        contact_person: '',
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: (values: typeof formData) => clientApi.create(values),
        onSuccess: (res: any) => {
            const newClient = res.data?.data;
            success('Client created successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['clients-list'] });

            if (newClient?.id) {
                onSuccess(newClient.id);
            }
            handleClose();
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to create client', 'Error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        mutation.mutate(formData);
    };

    const handleClose = () => {
        setFormData({
            client_code: '',
            name: '',
            company_name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            contact_person: '',
            notes: '',
        });
        onClose();
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Client (Quick)"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Client Name"
                        placeholder="e.g. John Doe"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        required
                    />
                    <Input
                        label="Company Name"
                        placeholder="e.g. Acme Corp"
                        value={formData.company_name}
                        onChange={(e) => updateField('company_name', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                    />
                    <Input
                        label="Phone"
                        placeholder="0812..."
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="City"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                    />
                    <Input
                        label="Contact Person"
                        placeholder="Optional"
                        value={formData.contact_person}
                        onChange={(e) => updateField('contact_person', e.target.value)}
                    />
                </div>

                <Textarea
                    label="Address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    rows={2}
                />

                <Textarea
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={2}
                />

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 mt-6">
                    <Button variant="outline" type="button" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={mutation.isPending}
                        leftIcon={<Save size={16} />}
                    >
                        Create Client
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
