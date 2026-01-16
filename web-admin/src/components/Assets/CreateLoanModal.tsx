import React, { useEffect, useState } from 'react';
import { employeeApi, type Employee } from '../../api/employee';
import { loanApi } from '../../api/loan';
import {
    Modal,
    Input,
    Select,
    Textarea,
    Button,
    LoadingOverlay,
    useToast,
    NumberInput
} from '../ui';

interface CreateLoanModalProps {
    opened: boolean;
    onClose: () => void;
    assetId: string;
    onSuccess: () => void;
}

export const CreateLoanModal: React.FC<CreateLoanModalProps> = ({ opened, onClose, assetId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const { success, error: showError } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        loan_date: new Date().toISOString().split('T')[0],
        expected_return_date: '',
        purpose: '',
        deposit_amount: 0,
    });

    useEffect(() => {
        if (opened) {
            fetchEmployees();
        }
    }, [opened]);

    const fetchEmployees = async () => {
        try {
            const data = await employeeApi.list({ limit: 100 }); // Basic list
            // Check if response is array or wrapped
            // employeeApi.list returns response.data
            // If backend handles /employees similarly to /categories, it might be { data: [] }
            // But let's assume it returns Employee[] based on type definition
            // Actually, let's play safe and check if it has .data property if it's not array
            if (Array.isArray(data)) {
                setEmployees(data);
            } else if ((data as any).data && Array.isArray((data as any).data)) {
                setEmployees((data as any).data);
            } else {
                setEmployees([]);
            }
        } catch (error) {
            showError('Failed to fetch employees', 'Error');
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employee_id) {
            showError('Please select an employee', 'Validation Error');
            return;
        }
        if (!formData.expected_return_date) {
            showError('Expected return date is required', 'Validation Error');
            return;
        }

        setLoading(true);
        try {
            await loanApi.create({
                asset_id: assetId,
                employee_id: formData.employee_id,
                // We map employee_id to borrower_id if the employee has a user_id, 
                // but for now backend logic handles linking or we just send employee_id.
                // LoanRequest struct has both borrower_id and employee_id. 
                // Let's assume we send employee_id and backend handles it.
                // Wait, backend create logic (LoanService::create) uses both. 
                // Let's find the employee object and see if they have user_id
                borrower_id: employees.find(e => e.id === formData.employee_id)?.user_id,
                loan_date: formData.loan_date,
                expected_return_date: formData.expected_return_date,
                purpose: formData.purpose,
                deposit_amount: formData.deposit_amount || undefined,
            });
            success('Loan request submitted', 'Success');
            onSuccess();
            onClose();
            // Reset
            setFormData({
                employee_id: '',
                loan_date: new Date().toISOString().split('T')[0],
                expected_return_date: '',
                purpose: '',
                deposit_amount: 0,
            });
        } catch (error: any) {
            showError(error.response?.data?.error || 'Failed to submit loan request', 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={opened} onClose={onClose} title="New Internal Loan">
            <div className="relative">
                <LoadingOverlay visible={loading} />
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        label="Employee (Borrower)"
                        placeholder="Select employee"
                        options={employees.map((e) => ({
                            value: e.id,
                            label: `${e.name} - ${e.position || 'No Position'}`
                        }))}
                        value={formData.employee_id}
                        onChange={(val) => handleChange('employee_id', val)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Loan Date"
                            type="date"
                            required
                            value={formData.loan_date}
                            onChange={(e) => handleChange('loan_date', e.target.value)}
                        />
                        <Input
                            label="Expected Return"
                            type="date"
                            required
                            value={formData.expected_return_date}
                            onChange={(e) => handleChange('expected_return_date', e.target.value)}
                        />
                    </div>

                    <NumberInput
                        label="Deposit Amount (Optional)"
                        placeholder="0.00"
                        min={0}
                        value={formData.deposit_amount}
                        onChange={(val) => handleChange('deposit_amount', val)}
                    />

                    <Textarea
                        label="Purpose / Notes"
                        placeholder="Reason for loan..."
                        value={formData.purpose}
                        onChange={(e) => handleChange('purpose', e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
                        <Button type="submit">Submit Request</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
