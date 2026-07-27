export interface AISettings {
    ai_agent_name?: string;
    ai_provider?: string;
    ai_endpoint?: string;
    ai_api_key?: string;
    ai_model?: string;
    ai_system_prompt?: string;
    ai_custom_knowledge?: string;
    app_name?: string;
}

export const aiApi = {
    // Send Chat Message to configured AI Provider
    sendMessage: async (
        userPrompt: string,
        history: { role: string; content: string }[],
        systemData: string,
        settings: Record<string, any>,
        currentUser?: { name?: string; email?: string; role?: string; department?: string; role_level?: number } | null
    ): Promise<string> => {
        const agentName = (settings['ai_agent_name'] || '').trim() || 'Hermes AI';
        const appName = (settings['app_name'] || '').trim() || 'Management System';
        const provider = settings['ai_provider'] || 'ollama';
        let endpoint = (settings['ai_endpoint'] || '').trim();
        const apiKey = (settings['ai_api_key'] || '').trim();
        const model = (settings['ai_model'] || '').trim() || (
            provider === 'openai' ? 'gpt-4o-mini' :
            provider === 'groq' ? 'llama-3.3-70b-versatile' :
            provider === 'anthropic' ? 'claude-3-5-sonnet-latest' :
            provider === '9router' ? 'combo-kantor' : 'llama3'
        );

        const activeUserText = currentUser && currentUser.name
            ? `Pengguna Aktif Terautentikasi (Logged-In User):
- Nama Pengguna: ${currentUser.name}
- Email: ${currentUser.email}
- Role / Akses: ${currentUser.role} (Level Privilege: ${currentUser.role_level ?? 1})
- Departemen: ${currentUser.department || 'General'}`
            : `Pengguna Aktif: Tamu / Anonim`;

        const longTermMemory = (settings['ai_custom_knowledge'] || '').trim();

        const customSystemPrompt = settings['ai_system_prompt'] || '';
        const defaultSystemPrompt = `
[SANGAT PENTING: WAJIB MENJAWAB DALAM BAHASA INDONESIA]

Nama Anda adalah ${agentName}, AI Assistant profesional untuk ${appName}.
Tugas Anda: Membantu operasional pengelolaan aset, user/pengguna & karyawan, maintenance (work order), inventaris, dan keuangan di ${appName}.

=== SIKAP TERHADAP PENGGUNA TERDAFTAR ===
${activeUserText}

INFORMASI SANGAT PENTING:
- Jika lawan bicara Anda bertanya "Kamu tahu siapa saya?", "Siapa saya?", "Siapa user yang sedang aktif?", atau pertanyaan sejenis, Anda WAJIB MENGENALI DAN MENYEBUTKAN NAMA PENGGUNA (${currentUser?.name || 'User'}), EMAIL (${currentUser?.email || ''}), dan ROLE (${currentUser?.role || ''}) secara ramah, sopan, dan jelas.

=== KNOWLEDGE BASE & INGATAN JANGKA PANJANG (LEARNED MEMORY & SKILLS) ===
${longTermMemory || 'Belum ada ingatan khusus yang disimpan.'}
(Gunakan ingatan di atas sebagai pedoman aturan bisnis, SOP, dan pengetahuan permanen perusahaan).

=== DATA REAL-TIME SISTEM (FULL DATABASE CONTEXT) ===
${systemData || 'Sedang memuat data...'}

Aturan Gaya Bahasa:
1. SELALU gunakan Bahasa Indonesia yang sopan, ramah, dan profesional.
2. JANGAN PERNAH menjawab dalam Bahasa Inggris.
3. Berikan jawaban yang spesifik berdasarkan Data Real-time dan Ingatan Jangka Panjang jika ditanya aturan bisnis atau data sistem.
`;

        const finalSystemPrompt = customSystemPrompt.trim()
            ? `${customSystemPrompt}\n\n${activeUserText}\n\n=== KNOWLEDGE BASE & INGATAN JANGKA PANJANG ===\n${longTermMemory}\n\nData Real-time Sistem:\n${systemData}`
            : defaultSystemPrompt;

        // Clean up endpoint formatting
        if (!endpoint) {
            if (provider === 'ollama') endpoint = 'http://localhost:11434';
            else if (provider === '9router') endpoint = 'http://localhost:20128/v1';
            else if (provider === 'openai') endpoint = 'https://api.openai.com/v1';
            else if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1';
            else if (provider === 'anthropic') endpoint = 'https://api.anthropic.com';
            else endpoint = 'http://localhost:11434';
        }
        endpoint = endpoint.replace(/\/+$/, ''); // Remove trailing slashes

        // 1. Ollama Provider (Native Ollama API)
        if (provider === 'ollama' && !endpoint.includes('/v1')) {
            const historyText = history.slice(-6).map(m =>
                `${m.role === 'user' ? 'User' : agentName}: ${m.content}`
            ).join('\n');

            const fullPrompt = `${finalSystemPrompt}\n\nHistory:\n${historyText}\n\nUser: ${userPrompt}\n\n${agentName}:`;

            const targetUrl = endpoint.startsWith('http')
                ? `${endpoint}/api/generate`
                : '/ollama/api/generate';

            const resp = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: fullPrompt,
                    stream: false,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error(`Ollama Error (${resp.status}): ${errText || resp.statusText}`);
            }

            const data = await resp.json();
            return data.response || `Tidak ada respon dari ${agentName}.`;
        }

        // 2. Anthropic Claude Provider
        if (provider === 'anthropic') {
            const targetUrl = `${endpoint}/v1/messages`;
            const formattedMessages = [
                ...history.slice(-6).map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content
                })),
                { role: 'user', content: userPrompt }
            ];

            const resp = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 1024,
                    system: finalSystemPrompt,
                    messages: formattedMessages,
                }),
            });

            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(`Anthropic Error: ${errJson.error?.message || resp.statusText}`);
            }

            const data = await resp.json();
            return data.content?.[0]?.text || `Tidak ada respon dari ${agentName}.`;
        }

        // 3. OpenAI / Groq / 9router / Custom OpenAI-Compatible Chat Completions Provider
        const targetUrl = endpoint.endsWith('/chat/completions')
            ? endpoint
            : `${endpoint}/chat/completions`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const messages = [
            { role: 'system', content: finalSystemPrompt },
            ...history.slice(-6).map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            })),
            { role: 'user', content: userPrompt }
        ];

        const resp = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                stream: false,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            let errMsg = resp.statusText;
            try {
                const errJson = JSON.parse(errText);
                errMsg = errJson.error?.message || errJson.message || errMsg;
            } catch {
                if (errText) errMsg = errText;
            }
            throw new Error(`API Error (${resp.status}): ${errMsg}`);
        }

        const rawText = await resp.text();

        // A. Standard JSON response
        try {
            const data = JSON.parse(rawText);
            if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            if (data.choices?.[0]?.text) {
                return data.choices[0].text;
            }
        } catch {
            // Raw text is not standard JSON (e.g. SSE streaming format data: {...})
        }

        // B. SSE Format handling ("data: {"id":...}")
        if (rawText.includes('data:')) {
            const lines = rawText.split('\n');
            let contentAcc = '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const delta = parsed.choices?.[0]?.delta?.content || 
                                      parsed.choices?.[0]?.message?.content || 
                                      parsed.choices?.[0]?.text || '';
                        contentAcc += delta;
                    } catch {
                        // ignore unparseable line
                    }
                }
            }
            if (contentAcc) return contentAcc;
        }

        return rawText || `Tidak ada respon dari ${agentName}.`;
    },

    // Test Connection helper
    testConnection: async (settings: Record<string, any>): Promise<string> => {
        return aiApi.sendMessage('Halo, uji koneksi AI.', [], 'Sistem OK', settings);
    }
};
