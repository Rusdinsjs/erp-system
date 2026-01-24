import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Palette, DollarSign, Upload, Image as ImageIcon } from 'lucide-react';
import { settingsApi } from '../api/settings';
import {
    Button,
    Card,
    Input,
    LoadingOverlay,
    useToast,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from '../components/ui';

export function Settings() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [activeTab, setActiveTab] = useState('general');

    // Fetch all settings
    const { data: settings = [], isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.getAll
    });

    // Helper to get value
    const getSetting = (key: string, defaultVal: any = '') => {
        const found = settings.find(s => s.key === key);
        return found ? found.value : defaultVal;
    };

    // Form State (Local)
    const [formData, setFormData] = useState<Record<string, any>>({});

    // Sync local state when data loads
    useEffect(() => {
        if (settings.length > 0) {
            const initialData: Record<string, any> = {};
            settings.forEach(s => {
                initialData[s.key] = s.value;
            });
            setFormData(initialData);
        }
    }, [settings]);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: Record<string, any>) => {
            const promises = Object.entries(data).map(([key, value]) => {
                // Only update if changes occurred compared to original
                if (getSetting(key) !== value) {
                    return settingsApi.update(key, value);
                }
                return Promise.resolve();
            });
            return Promise.all(promises);
        },
        onSuccess: () => {
            success('Settings saved successfully', 'Saved');
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['public-settings'] }); // Refresh public config
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to save settings', 'Error');
        }
    });

    const handleSave = () => {
        updateMutation.mutate(formData);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
                    <p className="text-gray-400 mt-2">Configure global application parameters</p>
                </div>
                <Button
                    leftIcon={<Save size={18} />}
                    onClick={handleSave}
                    disabled={updateMutation.isPending || isLoading}
                    className="rounded-xl shadow-lg shadow-blue-500/20"
                >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Card className="p-0 overflow-hidden relative">
                <LoadingOverlay visible={isLoading} />

                <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 bg-gray-950/30 border-r border-white/5 p-4 md:min-h-[600px]">
                        <TabsList className="flex flex-col h-auto bg-transparent gap-2 w-full">
                            <TabsTrigger
                                value="general"
                                icon={<Globe size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-blue-600/10 data-[state=active]:text-blue-400"
                            >
                                General
                            </TabsTrigger>
                            <TabsTrigger
                                value="appearance"
                                icon={<Palette size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-purple-600/10 data-[state=active]:text-purple-400"
                            >
                                Appearance
                            </TabsTrigger>
                            <TabsTrigger
                                value="finance"
                                icon={<DollarSign size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-emerald-600/10 data-[state=active]:text-emerald-400"
                            >
                                Finance
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 p-8 bg-gray-900/20">
                        <TabsContent value="general" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">General Information</h3>
                                <p className="text-sm text-gray-400 mb-6">Basic identification details for the system.</p>

                                <div className="space-y-4 max-w-xl">
                                    <Input
                                        label="Application Name"
                                        value={formData['app_name'] || ''}
                                        onChange={(e) => handleChange('app_name', e.target.value)}
                                        placeholder="e.g. Asset Management System"
                                    />
                                    {/* Additional fields can be added dynamically */}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="appearance" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Branding</h3>
                                <p className="text-sm text-gray-400 mb-6">Customize the look and feel.</p>

                                <div className="space-y-4 max-w-xl">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-24 h-24 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                            {formData['company_logo'] ? (
                                                <img
                                                    src={formData['company_logo']}
                                                    alt="Company Logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <ImageIcon className="text-gray-600" size={32} />
                                            )}
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs font-bold text-white">Preview</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <Input
                                                label="Logo URL"
                                                value={formData['company_logo'] || ''}
                                                onChange={(e) => handleChange('company_logo', e.target.value)}
                                                placeholder="https://..."
                                            />

                                            <div>
                                                <input
                                                    type="file"
                                                    id="logo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        try {
                                                            // Optimistic update or wait? Wait is safer for uploads
                                                            const result = await settingsApi.uploadFile(file);
                                                            handleChange('company_logo', result.url);
                                                            success('Logo uploaded successfully');
                                                        } catch (err) {
                                                            showError('Failed to upload logo');
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    leftIcon={<Upload size={14} />}
                                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                                >
                                                    Upload Image
                                                </Button>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Recommended: 512x512px PNG or JPG. Max 2MB.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="finance" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Financial Parameters</h3>
                                <p className="text-sm text-gray-400 mb-6">Default values for financial calculations.</p>

                                <div className="space-y-4 max-w-xl">
                                    <Input
                                        label="Default Tax Rate (0.0 - 1.0)"
                                        type="number"
                                        step="0.01"
                                        value={formData['tax_rate'] || ''}
                                        onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}
