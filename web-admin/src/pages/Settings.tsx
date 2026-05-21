import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Palette, DollarSign, Upload, Image as ImageIcon, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
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

export default function Settings() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const { theme, setTheme } = useTheme();

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
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">System Settings</h1>
                    <p className="text-muted-foreground mt-2">Configure global application parameters</p>
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
                    <div className="w-full md:w-64 bg-muted/30 border-r border-border p-4 md:min-h-[600px]">
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
                            <TabsTrigger
                                value="assets"
                                icon={<Monitor size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-cyan-600/10 data-[state=active]:text-cyan-400"
                            >
                                Asset Monitoring
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 p-8 bg-card">
                        <TabsContent value="general" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-1">General Information</h3>
                                <p className="text-sm text-muted-foreground mb-6">Basic identification details for the system.</p>

                                <div className="space-y-4 max-w-xl">
                                    <Input
                                        label="Application Name"
                                        value={formData['app_name'] || ''}
                                        onChange={(e) => handleChange('app_name', e.target.value)}
                                        placeholder="e.g. Asset Management System"
                                    />

                                    <div className="border-t border-border my-6"></div>

                                    <h3 className="text-lg font-bold text-foreground mb-1">Company Profile</h3>
                                    <p className="text-sm text-muted-foreground mb-6">These details will be used for invoices and reports.</p>

                                    <div className="space-y-4">
                                        <Input
                                            label="Company Name"
                                            value={formData['company_name'] || ''}
                                            onChange={(e) => handleChange('company_name', e.target.value)}
                                            placeholder="e.g. PT SJS Group"
                                        />
                                        <Input
                                            label="Phone Number"
                                            value={formData['company_phone'] || ''}
                                            onChange={(e) => handleChange('company_phone', e.target.value)}
                                            placeholder="e.g. +62 812 3456 7890"
                                        />
                                        <Input
                                            label="Email Address"
                                            value={formData['company_email'] || ''}
                                            onChange={(e) => handleChange('company_email', e.target.value)}
                                            placeholder="e.g. contact@sjsgroup.site"
                                        />
                                        <Input
                                            label="Address"
                                            value={formData['company_address'] || ''}
                                            onChange={(e) => handleChange('company_address', e.target.value)}
                                            placeholder="City, Province, Zip Code"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="appearance" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-1">Branding</h3>
                                <p className="text-sm text-muted-foreground mb-6">Customize the look and feel.</p>

                                <div className="space-y-4 max-w-xl">
                                    {/* Theme Selector */}
                                    <div className="mb-6">
                                        <label className="text-sm font-medium text-foreground block mb-3">Color Theme</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setTheme('dark')}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === 'dark'
                                                    ? 'border-primary bg-accent/40 text-foreground'
                                                    : 'border-border bg-card/20 text-muted-foreground hover:border-muted-foreground/30'
                                                    }`}
                                            >
                                                <Moon size={24} className={theme === 'dark' ? 'text-primary' : 'text-gray-400'} />
                                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-400'}`}>Dark</span>
                                            </button>

                                            <button
                                                onClick={() => setTheme('light')}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === 'light'
                                                    ? 'border-primary bg-accent/40 text-foreground'
                                                    : 'border-border bg-card/20 text-muted-foreground hover:border-muted-foreground/30'
                                                    }`}
                                            >
                                                <Sun size={24} className={theme === 'light' ? 'text-primary' : 'text-gray-400'} />
                                                <span className={`text-sm font-medium ${theme === 'light' ? 'text-foreground' : 'text-gray-400'}`}>Light</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-t border-border my-6"></div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-24 h-24 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden relative group">
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
                                <h3 className="text-lg font-bold text-foreground mb-1">Financial Parameters</h3>
                                <p className="text-sm text-muted-foreground mb-6">Default values for financial calculations.</p>

                                <div className="space-y-4 max-w-xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Default Tax Rate (%)"
                                            type="number"
                                            step="0.1"
                                            value={formData['tax_rate'] !== undefined ? formData['tax_rate'] * 100 : ''}
                                            onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) / 100)}
                                            placeholder="e.g. 11"
                                        />
                                        <Input
                                            label="Currency Symbol"
                                            value={formData['currency_symbol'] || 'Rp'}
                                            onChange={(e) => handleChange('currency_symbol', e.target.value)}
                                            placeholder="e.g. Rp"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Currency Code"
                                            value={formData['currency_code'] || 'IDR'}
                                            onChange={(e) => handleChange('currency_code', e.target.value)}
                                            placeholder="e.g. IDR"
                                        />
                                        <Input
                                            label="Date Format"
                                            value={formData['date_format'] || 'DD/MM/YYYY'}
                                            onChange={(e) => handleChange('date_format', e.target.value)}
                                            placeholder="e.g. DD/MM/YYYY"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="assets" className="mt-0 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-1">Asset Monitoring & Renewals</h3>
                                <p className="text-sm text-muted-foreground mb-6">Configure thresholds for automated alerts and workflows.</p>

                                <div className="space-y-6 max-w-xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="STNK (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['STNK'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'STNK': val });
                                            }}
                                            placeholder="30"
                                        />
                                        <Input
                                            label="Pajak / TAX (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['TAX'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'TAX': val });
                                            }}
                                            placeholder="30"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="KIR (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['KIR'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'KIR': val });
                                            }}
                                            placeholder="30"
                                        />
                                        <Input
                                            label="Lapor Tiba (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['LAPOR_TIBA'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'LAPOR_TIBA': val });
                                            }}
                                            placeholder="30"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Pajak Alat Berat (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['HEAVY_EQUIPMENT_TAX'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'HEAVY_EQUIPMENT_TAX': val });
                                            }}
                                            placeholder="30"
                                        />
                                        <Input
                                            label="Lainnya / Default (Days)"
                                            type="number"
                                            value={formData['tax_renewal_warning_days']?.['DEFAULT'] ?? 30}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const current = formData['tax_renewal_warning_days'] || {};
                                                handleChange('tax_renewal_warning_days', { ...current, 'DEFAULT': val });
                                            }}
                                            placeholder="30"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                                        <strong>Tip:</strong> Jumlah hari sebelum jatuh tempo untuk secara otomatis memunculkan tugas perpanjangan di tab "Needs Attention".
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}
