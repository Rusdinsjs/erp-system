import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metadataApi } from '../../api/metadataApi';
import { showToast } from '../../components/ui/Toast';
import { Plus, Trash2, Database, Layout } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export default function MetadataEditor() {
    const queryClient = useQueryClient();
    const [selectedEntity, setSelectedEntity] = useState<string>('ASSET'); // Default example

    const { data: bundle, isLoading } = useQuery({
        queryKey: ['metadata-bundle', selectedEntity],
        queryFn: () => metadataApi.getEntityBundle(selectedEntity),
        retry: false
    });

    const [isAddingField, setIsAddingField] = useState(false);
    const [newField, setNewField] = useState({
        field_name: '',
        label: '',
        data_type: 'STRING',
        is_required: false
    });

    const addFieldMutation = useMutation({
        mutationFn: () => metadataApi.addCustomField(selectedEntity, newField),
        onSuccess: () => {
            showToast('Field added successfully', 'success');
            setIsAddingField(false);
            setNewField({ field_name: '', label: '', data_type: 'STRING', is_required: false });
            queryClient.invalidateQueries({ queryKey: ['metadata-bundle', selectedEntity] });
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to add field', 'error');
        }
    });

    const removeFieldMutation = useMutation({
        mutationFn: (fieldId: string) => metadataApi.removeCustomField(selectedEntity, fieldId),
        onSuccess: () => {
            showToast('Field removed successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['metadata-bundle', selectedEntity] });
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to remove field', 'error');
        }
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Metadata & Custom Fields"
                description="Manage custom properties and schema for your entities."
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Sidebar: Entity List */}
                <Card className="col-span-1 p-4 h-[calc(100vh-12rem)]">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                        <Database className="w-4 h-4 mr-2" />
                        Entities
                    </h3>
                    <ul className="space-y-1">
                        {['ASSET', 'SALES_INVOICE', 'PURCHASE_BILL', 'WORK_ORDER', 'INVENTORY_ITEM'].map(entity => (
                            <li key={entity}>
                                <button
                                    onClick={() => setSelectedEntity(entity)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                                        selectedEntity === entity
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {entity.replace('_', ' ')}
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Main Content: Field List */}
                <Card className="col-span-3 p-6 h-[calc(100vh-12rem)] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedEntity.replace('_', ' ')} Fields</h2>
                            <p className="text-sm text-gray-500">Configure custom fields for this entity.</p>
                        </div>
                        <button
                            onClick={() => setIsAddingField(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Custom Field
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10 text-gray-500">Loading schema...</div>
                    ) : !bundle ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 mb-4">Entity not registered in Metadata Engine.</p>
                            <button className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm">
                                Register Entity
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Field Table */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (Key)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {bundle.fields.map(field => (
                                            <tr key={field.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.label}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.field_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {field.data_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {field.is_required ? 'Yes' : 'No'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => removeFieldMutation.mutate(field.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {bundle.fields.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No custom fields defined yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Field Modal */}
            {isAddingField && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add Custom Field</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Label</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={newField.label}
                                            onChange={e => {
                                                const label = e.target.value;
                                                // Auto-generate field_name from label
                                                const field_name = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                setNewField({ ...newField, label, field_name });
                                            }}
                                            placeholder="e.g. Project Code"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name (Key)</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50"
                                            value={newField.field_name}
                                            readOnly
                                            disabled
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Auto-generated unique key for database.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Data Type</label>
                                        <select
                                            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={newField.data_type}
                                            onChange={e => setNewField({ ...newField, data_type: e.target.value })}
                                        >
                                            <option value="STRING">Text (String)</option>
                                            <option value="NUMBER">Integer (Number)</option>
                                            <option value="DECIMAL">Decimal / Money</option>
                                            <option value="BOOLEAN">Checkbox (Boolean)</option>
                                            <option value="DATE">Date</option>
                                            <option value="DATETIME">Date & Time</option>
                                            <option value="JSON">Complex (JSON)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="is_required"
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            checked={newField.is_required}
                                            onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                                        />
                                        <label htmlFor="is_required" className="ml-2 block text-sm text-gray-900">
                                            Mandatory Field (Required)
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => addFieldMutation.mutate()}
                                    disabled={addFieldMutation.isPending || !newField.field_name}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {addFieldMutation.isPending ? 'Saving...' : 'Save Field'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingField(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
