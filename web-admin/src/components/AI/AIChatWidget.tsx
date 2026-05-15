import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Maximize2 } from 'lucide-react';

export const AIChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        { id: '1', role: 'assistant', content: 'Halo! Saya Hermes AI, asisten virtual Management System Anda. Ada yang bisa saya bantu hari ini?', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const systemContext = `
            [SANGAT PENTING: WAJIB MENJAWAB DALAM BAHASA INDONESIA]
            
            Nama Anda adalah Hermes, AI Assistant profesional untuk SJS Management System.
            Tugas Anda: Membantu operasional pengelolaan aset, maintenance (work order), dan inventaris di SJS Group.
            
            Pengetahuan Sistem:
            - Modul: Assets, Operations, Finance, HR, dan System Settings.
            - SJS Group adalah perusahaan Anda.
            
            Aturan Gaya Bahasa:
            1. SELALU gunakan Bahasa Indonesia yang sopan dan santun.
            2. JANGAN PERNAH menjawab dalam Bahasa Inggris.
            3. Berikan saran teknis yang praktis dan membantu.
            
            [PENTING: JAWABLAH HANYA DALAM BAHASA INDONESIA]
            `;

            const response = await fetch('/ollama/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3',
                    prompt: `${systemContext}\n\nUser: ${userMsg.content}\n\nHermes:`,
                    stream: false,
                }),
            });
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.response, timestamp: new Date() }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: 'Koneksi ke Mesin AI gagal.', timestamp: new Date() }]);
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
                            <h3 className="font-semibold text-sm">Hermes AI (Llama 3)</h3>
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
                        {isLoading && <div className="p-3 rounded-2xl bg-muted border border-border w-fit"><Loader2 className="animate-spin text-primary" size={16} /></div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-card border-t border-border">
                        <div className="relative flex items-center">
                            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tanya apa saja..." className="w-full bg-muted border-0 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground" rows={1} />
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
