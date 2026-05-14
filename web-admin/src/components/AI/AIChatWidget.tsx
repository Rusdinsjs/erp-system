import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader2, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AIChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Halo! Saya Hermes AI, asisten virtual Management System Anda. Ada yang bisa saya bantu terkait data aset, laporan, atau kontrak hari ini?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Kita arahkan ke endpoint Nginx yang me-reverse proxy ke Ollama container
            const response = await fetch('/ollama/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3',
                    prompt: `You are Hermes, an expert AI assistant for an Enterprise Asset Management System. The user asked: ${userMessage.content}\n\nRespond directly and concisely in Indonesian language.`,
                    stream: false,
                }),
            });

            if (!response.ok) throw new Error('Failed to connect to AI server');

            const data = await response.json();
            
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Mohon maaf, koneksi ke mesin AI sedang terputus atau model sedang dimuat. Silakan coba beberapa saat lagi.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            console.error('AI Chat Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className={cn(
                    "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-4 border border-slate-200 dark:border-slate-800 transition-all duration-300",
                    isExpanded ? "w-[800px] h-[80vh]" : "w-[380px] h-[550px]"
                )}>
                    {/* Header */}
                    <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <Sparkles size={18} className="text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Hermes AI</h3>
                                <p className="text-[10px] text-primary-foreground/80 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    Powered by Llama 3
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                            >
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm",
                                    msg.role === 'user' ? "bg-primary" : "bg-gradient-to-br from-indigo-500 to-purple-600"
                                )}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user' 
                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                )}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    <span className="text-[10px] opacity-50 mt-1 block text-right">
                                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                                    <Bot size={16} />
                                </div>
                                <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-primary" />
                                    <span className="text-sm text-slate-500">Hermes sedang berpikir...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative flex items-center">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Tanya apa saja ke Hermes..."
                                className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 mt-2">
                            AI dapat membuat kesalahan. Harap verifikasi info penting.
                        </p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-center p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95",
                    isOpen 
                        ? "bg-slate-800 hover:bg-slate-900 text-white" 
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                )}
            >
                {isOpen ? <X size={24} /> : <Bot size={28} />}
            </button>
        </div>
    );
};
