import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, Palette, Bot, Play, Sparkles, Eye, EyeOff, CheckCircle2, Loader2, DollarSign, Upload, Image as ImageIcon, Moon, Sun, Monitor, LayoutGrid, RotateCcw, GripVertical, X as XIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { settingsApi } from '../api/settings';
import { aiApi } from '../api/ai';
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
import { DEFAULT_LAUNCHPAD_CONFIG, MENU_LABELS, type LaunchpadConfig, type LaunchpadModuleConfig, type MenuId } from '../config/launchpadConfig';

export default function Settings() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const { theme, setTheme } = useTheme();

    const [isTestingAI, setIsTestingAI] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const handleTestAI = async () => {
        setIsTestingAI(true);
        try {
            const res = await aiApi.testConnection(formData);
            success(`AI Connection Success! Response: "${res.slice(0, 60)}..."`, 'AI Test OK');
        } catch (err: any) {
            showError(err.message || 'AI Connection Failed', 'AI Test Error');
        } finally {
            setIsTestingAI(false);
        }
    };

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
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
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
                                                        <TabsTrigger
                                value="ai"
                                icon={<Bot size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-indigo-600/10 data-[state=active]:text-indigo-400"
                            >
                                AI Integration
                            </TabsTrigger>
                            <TabsTrigger
                                value="launchpad" 
                                icon={<LayoutGrid size={16} />}
                                className="w-full justify-start px-4 py-3 data-[state=active]:bg-orange-600/10 data-[state=active]:text-orange-400"
                            >
                                Launchpad
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 p-8 bg-card">
                                                {/* AI & LLM Integration Tab */}
                        <TabsContent value="ai" className="mt-0 space-y-6">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                                            <Bot className="text-indigo-500" size={20} />
                                            AI & LLM Provider Configuration
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Hubungkan Hermes AI Assistant dengan Provider LLM pilihan Anda (Ollama, OpenAI, Groq, Anthropic, atau Custom OpenAI API).
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={isTestingAI ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                        onClick={handleTestAI}
                                        disabled={isTestingAI}
                                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                                    >
                                        {isTestingAI ? 'Testing Connection...' : 'Test AI Connection'}
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {/* Agent Name Input */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-foreground">Nama Asisten AI (Agent Name / Call Sign)</label>
                                        <Input
                                            value={formData['ai_agent_name'] ?? ''}
                                            onChange={(e) => handleChange('ai_agent_name', e.target.value)}
                                            placeholder="e.g. Hermes AI, Jarvis, SJS Assistant"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Nama panggilan asisten virtual yang tampil pada header widget chat, sapaan pengguna, dan identitas agen AI.
                                        </p>
                                    </div>

                                    {/* AI Provider Select Cards */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Select AI Provider</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { id: 'ollama', name: 'Ollama', desc: 'Local LLM (Llama 3, Mistral)', defaultEndpoint: 'http://localhost:11434', defaultModel: 'llama3' },
                                                { id: 'openai', name: 'OpenAI', desc: 'ChatGPT (gpt-4o, gpt-4o-mini)', defaultEndpoint: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
                                                { id: 'groq', name: 'Groq', desc: 'Ultra-fast Llama 3.3 70B', defaultEndpoint: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
                                                { id: 'anthropic', name: 'Anthropic', desc: 'Claude 3.5 Sonnet', defaultEndpoint: 'https://api.anthropic.com', defaultModel: 'claude-3-5-sonnet-latest' },
                                                { id: 'custom', name: 'Custom API', desc: 'OpenAI-Compatible (vLLM, LM Studio)', defaultEndpoint: 'http://localhost:1234/v1', defaultModel: 'custom-model' }
                                            ].map(p => {
                                                const isSelected = (formData['ai_provider'] || 'ollama') === p.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleChange('ai_provider', p.id);
                                                            if (!formData['ai_endpoint']) handleChange('ai_endpoint', p.defaultEndpoint);
                                                            if (!formData['ai_model']) handleChange('ai_model', p.defaultModel);
                                                        }}
                                                        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                                                            isSelected
                                                                ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                                                                : 'border-border bg-card/50 hover:bg-muted/50'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 text-indigo-400">
                                                                <CheckCircle2 size={16} />
                                                            </div>
                                                        )}
                                                        <div className="font-semibold text-sm text-foreground">{p.name}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Base Endpoint URL */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-foreground">API Base Endpoint URL</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={formData['ai_endpoint'] ?? ''}
                                                onChange={(e) => handleChange('ai_endpoint', e.target.value)}
                                                placeholder="e.g. http://localhost:11434 atau https://api.openai.com/v1"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const p = formData['ai_provider'] || 'ollama';
                                                    if (p === 'ollama') handleChange('ai_endpoint', 'http://localhost:11434');
                                                    else if (p === 'openai') handleChange('ai_endpoint', 'https://api.openai.com/v1');
                                                    else if (p === 'groq') handleChange('ai_endpoint', 'https://api.groq.com/openai/v1');
                                                    else if (p === '9router') handleChange('ai_endpoint', 'http://localhost:20128/v1');
                                                    else if (p === 'anthropic') handleChange('ai_endpoint', 'https://api.anthropic.com');
                                                    else handleChange('ai_endpoint', 'http://localhost:1234/v1');
                                                }}
                                                className="text-xs text-muted-foreground"
                                            >
                                                Reset Default
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            URL dasar server AI. Untuk Ollama lokal: <code>http://localhost:11434</code>
                                        </p>
                                    </div>

                                    {/* API Key */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-foreground">API Key (Secret)</label>
                                        <div className="relative">
                                            <Input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={formData['ai_api_key'] ?? ''}
                                                onChange={(e) => handleChange('ai_api_key', e.target.value)}
                                                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                            >
                                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Wajib diisi jika menggunakan OpenAI, Groq, Anthropic, atau Custom API. Kosongkan untuk Ollama lokal tanpa auth.
                                        </p>
                                    </div>

                                    {/* Model Name */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-foreground">Model Name</label>
                                        <Input
                                            value={formData['ai_model'] ?? ''}
                                            onChange={(e) => handleChange('ai_model', e.target.value)}
                                            placeholder="e.g. llama3, gpt-4o-mini, llama-3.3-70b-versatile"
                                        />
                                        
                                        {/* Popular Model Quick Picks */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="text-xs text-muted-foreground py-1">Rekomendasi Quick Pick:</span>
                                            {['combo-kantor', 'llama3', 'gpt-4o-mini', 'llama-3.3-70b-versatile', 'claude-3-5-sonnet-latest', 'mistral', 'qwen2.5'].map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => handleChange('ai_model', m)}
                                                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                                                        formData['ai_model'] === m
                                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-medium'
                                                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                                                    }`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Knowledge Base & Long-Term Memory */}
                                    <div className="space-y-1.5 pt-4 border-t border-border">
                                        <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                                            <Sparkles className="text-amber-400" size={16} />
                                            Knowledge Base & Ingatan Jangka Panjang (Pengembangan Diri AI)
                                        </label>
                                        <textarea
                                            rows={5}
                                            value={formData['ai_custom_knowledge'] ?? ''}
                                            onChange={(e) => handleChange('ai_custom_knowledge', e.target.value)}
                                            placeholder="Tuliskan pengetahuan, aturan SOP, catatan penting, atau instruksi permanen yang harus selalu diingat oleh AI (contoh: 'Aset alat berat jika rusak wajib melapor ke Budi', 'Batas stok reorder inventaris adalah 10 unit', dll.)."
                                            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 text-foreground outline-none resize-y placeholder:text-muted-foreground/50 font-mono text-xs"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Semua catatan di sini tersimpan **PERMANEN** di database dan menjadi ingatan/skill jangka panjang yang tidak akan pernah dilupakan oleh Agen AI terlepas dari provider atau model yang digunakan.
                                        </p>
                                    </div>

                                    {/* System Prompt Customization */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-foreground">Custom System Persona / Prompt</label>
                                        <textarea
                                            rows={4}
                                            value={formData['ai_system_prompt'] ?? ''}
                                            onChange={(e) => handleChange('ai_system_prompt', e.target.value)}
                                            placeholder="Kosongkan untuk menggunakan prompt standar Hermes AI. Masukkan instruksi khusus jika ingin mengubah karakter AI."
                                            className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 text-foreground outline-none resize-y placeholder:text-muted-foreground/50"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Kustomisasi instruksi dasar dan peran AI Hermes untuk disesuaikan dengan aturan bisnis perusahaan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="general"  className="mt-0 space-y-6">
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

                        <TabsContent value="launchpad" className="mt-0 space-y-6">
                            <LaunchpadConfigEditor
                                formData={formData}
                                handleChange={handleChange}
                                onSave={handleSave}
                                isSaving={updateMutation.isPending}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}

// ─── Launchpad Config Editor Component ────────────────────────────────────────

interface LaunchpadConfigEditorProps {
    formData: Record<string, any>;
    handleChange: (key: string, value: any) => void;
    onSave: () => void;
    isSaving: boolean;
}

function LaunchpadConfigEditor({ formData, handleChange }: LaunchpadConfigEditorProps) {
    const { success: showSuccess } = useToast();

    // Parse the current config from formData, fallback to default
    const currentConfig: LaunchpadConfig = (() => {
        try {
            const raw = formData['launchpad_config'];
            if (raw && typeof raw === 'object' && Array.isArray(raw.modules)) {
                return raw as LaunchpadConfig;
            }
            return DEFAULT_LAUNCHPAD_CONFIG;
        } catch {
            return DEFAULT_LAUNCHPAD_CONFIG;
        }
    })();

    const [expandedModule, setExpandedModule] = useState<string | null>(null);

    // All possible menu IDs from the labels registry
    const allMenuIds = Object.keys(MENU_LABELS) as MenuId[];

    // Get menu IDs already assigned to any module or global
    const getAssignedMenuIds = useCallback((): Set<MenuId> => {
        const assigned = new Set<MenuId>();
        currentConfig.modules.forEach(m => m.menuIds.forEach(id => assigned.add(id)));
        currentConfig.globalMenuIds.forEach(id => assigned.add(id));
        return assigned;
    }, [currentConfig]);

    // Update config in formData
    const updateConfig = useCallback((newConfig: LaunchpadConfig) => {
        handleChange('launchpad_config', newConfig);
    }, [handleChange]);

    // Toggle a menu ID in a module (ensures menu is moved if assigned elsewhere)
    const toggleMenuInModule = (targetModuleId: string, menuId: MenuId) => {
        const targetModule = currentConfig.modules.find(m => m.id === targetModuleId);
        const alreadyInTarget = targetModule?.menuIds.includes(menuId);

        const newModules = currentConfig.modules.map(m => {
            if (m.id === targetModuleId) {
                return {
                    ...m,
                    menuIds: alreadyInTarget
                        ? m.menuIds.filter(id => id !== menuId)
                        : [...m.menuIds, menuId]
                };
            } else if (!alreadyInTarget) {
                // If moving menuId to targetModuleId, remove it from other modules
                return {
                    ...m,
                    menuIds: m.menuIds.filter(id => id !== menuId)
                };
            }
            return m;
        });
        updateConfig({ ...currentConfig, modules: newModules });
    };

    // Toggle a global menu
    const toggleGlobalMenu = (menuId: MenuId) => {
        const has = currentConfig.globalMenuIds.includes(menuId);
        updateConfig({
            ...currentConfig,
            globalMenuIds: has
                ? currentConfig.globalMenuIds.filter(id => id !== menuId)
                : [...currentConfig.globalMenuIds, menuId]
        });
    };

    // Move a menu from one module to another (reserved for future drag-drop)
    // const moveMenuToModule = (menuId: MenuId, fromModuleId: string, toModuleId: string) => { ... }

    // Reset to default config
    const handleReset = () => {
        updateConfig(DEFAULT_LAUNCHPAD_CONFIG);
        showSuccess('Reset to default configuration');
    };

    // Toggle module enabled
    const toggleModuleEnabled = (moduleId: string) => {
        const newModules = currentConfig.modules.map(m =>
            m.id === moduleId ? { ...m, enabled: !m.enabled } : m
        );
        updateConfig({ ...currentConfig, modules: newModules });
    };

    // Update module field
    const updateModuleField = (moduleId: string, field: keyof LaunchpadModuleConfig, value: any) => {
        const newModules = currentConfig.modules.map(m =>
            m.id === moduleId ? { ...m, [field]: value } : m
        );
        updateConfig({ ...currentConfig, modules: newModules });
    };

    // Get unassigned menus
    const assigned = getAssignedMenuIds();
    const unassignedMenus = allMenuIds.filter(id => !assigned.has(id));

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Launchpad Configuration</h3>
                    <p className="text-sm text-muted-foreground mt-1">Configure which menus appear in each Launchpad module card.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RotateCcw size={14} />}
                        onClick={handleReset}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Reset Default
                    </Button>
                </div>
            </div>

            {/* Global Menus */}
            <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <GripVertical size={14} className="text-muted-foreground" />
                    Global Menus
                    <span className="text-xs text-muted-foreground font-normal">(Tampil di semua modul)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                    {currentConfig.globalMenuIds.map(menuId => (
                        <span
                            key={menuId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20"
                        >
                            {MENU_LABELS[menuId] || menuId}
                            <button
                                onClick={() => toggleGlobalMenu(menuId)}
                                className="hover:text-red-400 transition-colors"
                            >
                                <XIcon size={12} />
                            </button>
                        </span>
                    ))}
                    {/* Add global menu */}
                    {unassignedMenus.length > 0 && (
                        <select
                            className="px-2 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground cursor-pointer"
                            onChange={(e) => {
                                if (e.target.value) {
                                    toggleGlobalMenu(e.target.value as MenuId);
                                    e.target.value = '';
                                }
                            }}
                            value=""
                        >
                            <option value="">+ Add global...</option>
                            {unassignedMenus.map(id => (
                                <option key={id} value={id}>{MENU_LABELS[id]}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Module Cards */}
            <div className="mt-6 space-y-3">
                {currentConfig.modules
                    .sort((a, b) => a.order - b.order)
                    .map(mod => {
                        const isExpanded = expandedModule === mod.id;
                        return (
                            <div
                                key={mod.id}
                                className={`rounded-xl border transition-all ${
                                    mod.enabled
                                        ? 'border-border bg-card/50'
                                        : 'border-border/50 bg-muted/20 opacity-60'
                                }`}
                            >
                                {/* Module Header */}
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer select-none"
                                    onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${mod.iconBg}`}>
                                        {mod.order}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-foreground text-sm">{mod.title}</h4>
                                            <span className="text-xs text-muted-foreground">({mod.menuIds.length} menu)</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{mod.subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Enable/Disable Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleModuleEnabled(mod.id);
                                            }}
                                            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                                mod.enabled
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-muted text-muted-foreground border-border'
                                            }`}
                                        >
                                            {mod.enabled ? 'Active' : 'Disabled'}
                                        </button>
                                        {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                                        {/* Module Settings */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="Title"
                                                value={mod.title}
                                                onChange={(e) => updateModuleField(mod.id, 'title', e.target.value)}
                                            />
                                            <Input
                                                label="Subtitle"
                                                value={mod.subtitle}
                                                onChange={(e) => updateModuleField(mod.id, 'subtitle', e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="Default Route"
                                                value={mod.defaultRoute}
                                                onChange={(e) => updateModuleField(mod.id, 'defaultRoute', e.target.value)}
                                            />
                                            <Input
                                                label="Min Role Level"
                                                type="number"
                                                value={mod.minLevel}
                                                onChange={(e) => updateModuleField(mod.id, 'minLevel', parseInt(e.target.value))}
                                            />
                                        </div>

                                        {/* Menu Assignment */}
                                        <div>
                                            <label className="text-sm font-medium text-foreground block mb-2">Assigned Menus</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {mod.menuIds.map(menuId => (
                                                    <span
                                                        key={menuId}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium border border-primary/20"
                                                    >
                                                        {MENU_LABELS[menuId] || menuId}
                                                        <button
                                                            onClick={() => toggleMenuInModule(mod.id, menuId)}
                                                            className="hover:text-red-400 transition-colors"
                                                        >
                                                            <XIcon size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Add menu dropdown */}
                                            <select
                                                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground cursor-pointer w-full"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        toggleMenuInModule(mod.id, e.target.value as MenuId);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                value=""
                                            >
                                                <option value="">+ Add menu to this module...</option>
                                                {allMenuIds
                                                    .filter(id => !mod.menuIds.includes(id) && !currentConfig.globalMenuIds.includes(id))
                                                    .map(id => (
                                                        <option key={id} value={id}>
                                                            {MENU_LABELS[id]}
                                                            {assigned.has(id) ? ' (assigned elsewhere)' : ''}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Unassigned Warning */}
            {unassignedMenus.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-xs font-medium text-amber-400 mb-2">
                        ⚠ {unassignedMenus.length} menu belum di-assign ke modul apapun:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {unassignedMenus.map(id => (
                            <span key={id} className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">
                                {MENU_LABELS[id]}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Save Reminder */}
            <p className="mt-4 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                <strong>Note:</strong> Klik <strong>Save Changes</strong> di atas untuk menyimpan konfigurasi Launchpad. Perubahan akan langsung berlaku setelah disimpan.
            </p>
        </div>
    );
}
