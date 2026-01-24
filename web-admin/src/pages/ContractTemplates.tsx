import React, { useState, useEffect } from 'react';
import { contractTemplateApi } from '../api/contractTemplate';
import type { ContractTemplate, CreateContractTemplateRequest, UpdateContractTemplateRequest } from '../types/contractTemplate';
import { Plus, Edit2, Trash2, Eye, X, Save } from 'lucide-react';

const ContractTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
    const [formData, setFormData] = useState<CreateContractTemplateRequest>({
        name: '',
        description: '',
        header_content: '',
        body_content: '',
        footer_content: '',
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await contractTemplateApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
            alert('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        setFormData({
            name: '',
            description: '',
            header_content: '',
            body_content: '',
            footer_content: '',
        });
        setShowModal(true);
    };

    const handleEdit = (template: ContractTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            header_content: template.header_content || '',
            body_content: template.body_content,
            footer_content: template.footer_content || '',
        });
        setShowModal(true);
    };

    const handlePreview = (template: ContractTemplate) => {
        setPreviewTemplate(template);
        setShowPreview(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                const updateData: UpdateContractTemplateRequest = {
                    name: formData.name,
                    description: formData.description || undefined,
                    header_content: formData.header_content || undefined,
                    body_content: formData.body_content,
                    footer_content: formData.footer_content || undefined,
                };
                await contractTemplateApi.update(editingTemplate.id, updateData);
            } else {
                await contractTemplateApi.create(formData);
            }
            setShowModal(false);
            loadTemplates();
        } catch (error) {
            console.error('Failed to save template:', error);
            alert('Failed to save template');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await contractTemplateApi.delete(id);
            loadTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('Failed to delete template');
        }
    };

    const handleToggleActive = async (template: ContractTemplate) => {
        try {
            await contractTemplateApi.update(template.id, {
                is_active: !template.is_active,
            });
            loadTemplates();
        } catch (error) {
            console.error('Failed to toggle template status:', error);
            alert('Failed to update template status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contract Templates</h1>
                    <p className="text-gray-600 mt-1">Manage reusable contract templates</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus /> Create Template
                </button>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                                {template.description && (
                                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                )}
                            </div>
                            <span
                                className={`px-2 py-1 text-xs rounded-full ${template.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {template.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-2">
                                <span>Created: {new Date(template.created_at || '').toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePreview(template)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                                <Eye size={16} /> Preview
                            </button>
                            <button
                                onClick={() => handleEdit(template)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                                <Edit2 size={16} /> Edit
                            </button>
                            <button
                                onClick={() => handleDelete(template.id)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => handleToggleActive(template)}
                            className="w-full mt-3 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                            {template.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No templates found</p>
                    <p className="text-gray-400 mt-2">Create your first contract template to get started</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingTemplate ? 'Edit Template' : 'Create Template'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Template Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Standard Rental Agreement"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Brief description of this template"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Header Content
                                </label>
                                <textarea
                                    value={formData.header_content}
                                    onChange={(e) => setFormData({ ...formData, header_content: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="Header content (optional)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Body Content *
                                </label>
                                <textarea
                                    required
                                    value={formData.body_content}
                                    onChange={(e) => setFormData({ ...formData, body_content: e.target.value })}
                                    rows={12}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="Main contract content..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Tip: Use variables like {'{{client_name}}'}, {'{{contract_date}}'}, {'{{amount}}'} for dynamic content
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Footer Content
                                </label>
                                <textarea
                                    value={formData.footer_content}
                                    onChange={(e) => setFormData({ ...formData, footer_content: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="Footer content (optional)"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Save /> {editingTemplate ? 'Update' : 'Create'} Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && previewTemplate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Template Preview</h2>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">{previewTemplate.name}</h3>
                                {previewTemplate.description && (
                                    <p className="text-gray-600 mt-1">{previewTemplate.description}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                                {previewTemplate.header_content && (
                                    <div className="border-b pb-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Header</h4>
                                        <div className="whitespace-pre-wrap text-sm">{previewTemplate.header_content}</div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Body</h4>
                                    <div className="whitespace-pre-wrap text-sm">{previewTemplate.body_content}</div>
                                </div>

                                {previewTemplate.footer_content && (
                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Footer</h4>
                                        <div className="whitespace-pre-wrap text-sm">{previewTemplate.footer_content}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractTemplates;
