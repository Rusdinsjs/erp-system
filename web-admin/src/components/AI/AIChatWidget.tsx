import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Maximize2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/http';
import { assetApi } from '../../api/assets';
import { settingsApi } from '../../api/settings';
import { aiApi } from '../../api/ai';
import { useAuthStore } from '../../store/useAuthStore';

export const AIChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const currentUser = useAuthStore(state => state.user);

    // Fetch Settings
    const { data: settingsList = [] } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.getAll
    });

    const settingsMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        settingsList.forEach((s: any) => {
            map[s.key] = s.value;
        });
        return map;
    }, [settingsList]);

    const agentName = (settingsMap['ai_agent_name'] || '').trim() || 'Hermes AI';
    const appName = (settingsMap['app_name'] || '').trim() || 'Management System';
    const provider = settingsMap['ai_provider'] || 'ollama';
    const model = settingsMap['ai_model'] || (
        provider === 'openai' ? 'gpt-4o-mini' : 
        provider === 'groq' ? 'llama-3.3-70b-versatile' : 
        provider === '9router' ? 'combo-kantor' : 'llama3'
    );

    // Dynamic initial greeting using configured Agent Name and Application Name
    const [messages, setMessages] = useState<any[]>(() => [
        { 
            id: '1', 
            role: 'assistant', 
            content: `Halo! Saya ${agentName}, asisten virtual ${appName} Anda. Ada yang bisa saya bantu hari ini?`, 
            timestamp: new Date() 
        }
    ]);

    // Safely sync initial greeting when custom agentName or appName loads from settings
    useEffect(() => {
        setMessages(prev => {
            if (prev.length <= 1) {
                return [
                    { 
                        id: '1', 
                        role: 'assistant', 
                        content: `Halo! Saya ${agentName}, asisten virtual ${appName} Anda. Ada yang bisa saya bantu hari ini?`, 
                        timestamp: new Date() 
                    }
                ];
            }
            return prev;
        });
    }, [agentName, appName]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [systemData, setSystemData] = useState<string>('');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch COMPLETE system context data without pagination limits (Users, Employees, Assets, Work Orders, Inventory, Contracts, Rentals)
    useEffect(() => {
        if (isOpen && !systemData) {
            Promise.all([
                api.get('/users?limit=1000').catch(() => ({ data: { data: [] } })),
                api.get('/employees?limit=1000').catch(() => ({ data: { data: [] } })),
                assetApi.list({ page: 1, per_page: 1000 }).catch(() => ({ data: [] })),
                api.get('/work-orders?per_page=1000').catch(() => ({ data: { data: [] } })),
                api.get('/inventory/items?per_page=1000').catch(() => ({ data: { data: [] } })),
                api.get('/departments').catch(() => ({ data: { data: [] } })),
                api.get('/locations').catch(() => ({ data: { data: [] } })),
                api.get('/categories').catch(() => ({ data: { data: [] } })),
                api.get('/contracts?per_page=1000').catch(() => ({ data: { data: [] } })),
                api.get('/rentals?per_page=1000').catch(() => ({ data: { data: [] } }))
            ]).then(([usersRes, empRes, assetsRes, woRes, invRes, deptRes, locRes, catRes, contractRes, rentalRes]) => {
                const usersList = (usersRes.data?.data || usersRes.data || []);
                const empList = (empRes.data?.data || empRes.data || []);
                const assetsList = (assetsRes.data || []);
                const woList = (woRes.data?.data || woRes.data || []);
                const invList = (invRes.data?.data || invRes.data || []);
                const deptList = (deptRes.data?.data || deptRes.data || []);
                const locList = (locRes.data?.data || locRes.data || []);
                const catList = (catRes.data?.data || catRes.data || []);
                const contractList = (contractRes.data?.data || contractRes.data || []);
                const rentalList = (rentalRes.data?.data || rentalRes.data || []);

                const userSummary = Array.isArray(usersList) ? usersList.map((u: any) =>
                    `- User Account: "${u.name}" | Email: ${u.email} | Role Code: "${u.role_code || u.role}" | Status: ${u.is_active !== false ? 'Active' : 'Inactive'}${u.employee_name ? ` | Linked Employee: "${u.employee_name}"` : ''}`
                ).join('\n') : '';

                const empSummary = Array.isArray(empList) ? empList.map((e: any) =>
                    `- Karyawan: "${e.name || e.full_name}" | Posisi: ${e.job_title || 'Staff'} | Departemen: ${e.department || e.department_name || 'General'}${e.nik ? ` | NIK: ${e.nik}` : ''}`
                ).join('\n') : '';

                const assetSummary = Array.isArray(assetsList) ? assetsList.map((a: any) =>
                    `- Aset: Code=${a.asset_code} | Nama="${a.name}" | Merek/Model="${a.brand || ''} ${a.model || ''}" | Kategori="${a.category_name || a.category || ''}" | Status=${a.status || 'Active'}`
                ).join('\n') : '';

                const woSummary = Array.isArray(woList) ? woList.map((w: any) =>
                    `- Work Order: NO=${w.wo_number || w.id} | Judul="${w.title || w.description || 'Maintenance'}" | Status=${w.status || 'Pending'} | Prioritas=${w.priority || 'Normal'}${w.assigned_to_name ? ` | Teknisi: "${w.assigned_to_name}"` : ''}`
                ).join('\n') : '';

                const invSummary = Array.isArray(invList) ? invList.map((i: any) =>
                    `- Barang Inventaris: SKU=${i.item_code || i.sku || 'ITEM'} | Nama="${i.name}" | Stok=${i.quantity ?? i.stock ?? 0} ${i.unit || 'unit'}`
                ).join('\n') : '';

                const contractSummary = Array.isArray(contractList) ? contractList.map((c: any) =>
                    `- Kontrak: NO=${c.contract_number || c.id} | Klien="${c.client_name || ''}" | Status=${c.status}`
                ).join('\n') : '';

                const rentalSummary = Array.isArray(rentalList) ? rentalList.map((r: any) =>
                    `- Rental: NO=${r.rental_number || r.id} | Klien="${r.client_name || ''}" | Status=${r.status}`
                ).join('\n') : '';

                const deptSummary = Array.isArray(deptList) ? deptList.map((d: any) => d.name || d.title).filter(Boolean).join(', ') : '';
                const locSummary = Array.isArray(locList) ? locList.map((l: any) => l.name || l.title).filter(Boolean).join(', ') : '';
                const catSummary = Array.isArray(catList) ? catList.map((c: any) => c.name || c.title).filter(Boolean).join(', ') : '';

                const combinedContext = `
=== SELURUH DATA USER & AKUN SISTEM (${Array.isArray(usersList) ? usersList.length : 0} Total User) ===
${userSummary || 'Tidak ada data user'}

=== SELURUH DATA KARYAWAN & PEGAWAI (${Array.isArray(empList) ? empList.length : 0} Total Karyawan) ===
${empSummary || 'Tidak ada data karyawan'}

=== SELURUH DATA ASET SISTEM (${Array.isArray(assetsList) ? assetsList.length : 0} Total Aset) ===
${assetSummary || 'Tidak ada data aset'}

=== SELURUH DATA WORK ORDERS / MAINTENANCE (${Array.isArray(woList) ? woList.length : 0} Total WO) ===
${woSummary || 'Tidak ada work order'}

=== SELURUH DATA INVENTARIS BARANG (${Array.isArray(invList) ? invList.length : 0} Total Barang) ===
${invSummary || 'Tidak ada data inventaris'}

=== SELURUH DATA KONTRAK & RENTAL ===
${contractSummary || ''}
${rentalSummary || ''}

=== DAFTAR DEPARTEMEN, LOKASI & KATEGORI ===
Departemen: ${deptSummary || 'General'}
Lokasi: ${locSummary || 'Utama'}
Kategori: ${catSummary || 'Umum'}
`.trim();

                setSystemData(combinedContext);
            }).catch(err => console.error('Failed to fetch AI complete system context:', err));
        }
    }, [isOpen, systemData]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const aiResponse = await aiApi.sendMessage(userMsg.content, messages, systemData, settingsMap, currentUser);
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: aiResponse, timestamp: new Date() }]);
        } catch (error: any) {
            const errDetail = error?.message || 'Koneksi ke AI Provider gagal.';
            setMessages(prev => [...prev, { 
                id: (Date.now()+1).toString(), 
                role: 'assistant', 
                content: `?? Error AI (${provider}): ${errDetail}\n\nTip: Pengaturan Nama Agent, Provider & Model dapat diatur di menu System Settings -> AI Integration.`, 
                timestamp: new Date() 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className={`bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-4 border border-border transition-all duration-300 ${isExpanded ? "w-[800px] h-[80vh]" : "w-[380px] h-[550px]"}`}>
                    <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <Bot size={18} />
                            <div>
                                <h3 className="font-semibold text-sm">{agentName}</h3>
                                <p className="text-[10px] opacity-80 uppercase tracking-wider font-mono">{provider} • {model}</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"><Maximize2 size={16} /></button>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"><X size={20} /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? "ml-auto flex-row-reverse" : ""}`}>
                                <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-muted text-foreground border border-border rounded-tl-none"}`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="p-3 rounded-2xl bg-muted border border-border w-fit flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="animate-spin text-primary" size={16} /> Connecting to {provider}...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-card border-t border-border">
                        <div className="relative flex items-center">
                            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={`Tanya apa saja ke ${agentName}...`} className="w-full bg-muted border-0 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground" rows={1} />
                            <button onClick={handleSend} disabled={!input.trim() || isLoading} className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"><Send size={16} /></button>
                        </div>
                    </div>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-center p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${isOpen ? "bg-slate-800 text-white" : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"}`}>
                {isOpen ? <X size={24} /> : <Bot size={28} />}
            </button>
        </div>
    );
};
