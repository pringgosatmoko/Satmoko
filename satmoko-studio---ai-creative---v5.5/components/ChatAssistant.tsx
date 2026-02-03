
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

interface ChatAssistantProps {
  onBack: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getEnv = (key: string) => {
    const vEnv = (import.meta as any).env || {};
    const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
    const wEnv = (window as any).process?.env || {};
    const fallbacks: Record<string, string> = {
      'VITE_DATABASE_URL': 'https://urokqoorxuiokizesiwa.supabase.co',
      'VITE_SUPABASE_ANON_KEY': 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8'
    };
    return vEnv[key] || pEnv[key] || wEnv[key] || fallbacks[key] || "";
  };

  const supabase = useMemo(() => createClient(getEnv('VITE_DATABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY')), []);

  useEffect(() => {
    const welcome = "Halo. Asisten Satmoko bot siap melayani. Saya telah disinkronkan dengan seluruh modul kreatif di Satmoko Studio. Ada yang bisa saya bantu, Master?";
    setMessages([{ role: 'assistant', text: welcome }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, isTyping]);

  const sendTelegramForward = async (userMsg: string) => {
    try {
      const { data: configs } = await supabase.from('system_configs').select('*');
      const token = configs?.find(c => c.key === 'telegram_bot_token')?.value;
      const chatId = configs?.find(c => c.key === 'telegram_chat_id')?.value;
      
      if (token && chatId && token.length > 10) {
        const text = `<b>🤖 SATMOKO CHAT ALERT</b>\n\n<b>User:</b> <code>${userMsg}</code>\n\n<i>Time: ${new Date().toLocaleString()}</i>`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
      }
    } catch (e) { console.warn("Telegram silent fail"); }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    // Kirim notifikasi ke Telegram Admin (Bolo) secara background
    sendTelegramForward(userMsg);

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY_1') || 
                     getEnv('VITE_GEMINI_API_KEY_2') || 
                     getEnv('VITE_GEMINI_API_KEY_3') || 
                     getEnv('VITE_API_KEY') || 
                     getEnv('API_KEY');

      if (!apiKey) throw new Error("API Key tidak ditemukan.");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: `
            IDENTITAS: Kamu adalah "Asisten Satmoko bot", AI elit yang terintegrasi di dalam aplikasi "Satmoko Studio".
            MASTER: Master Pringgosatmoko.
            PENGETAHUAN PRODUK: Berbagai fitur AI (Image Gen, Video Gen, Studio, dll).
            GAYA BAHASA: Elegan, Profesional, Futuristik. Sapa user dengan Master atau Operator.
          `,
        },
      });

      const reply = response.text || "Terjadi gangguan pada transmisi data, Master.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      console.error("Gemini SDK Error:", e);
      setMessages(prev => [...prev, { role: 'assistant', text: `SYNC ERROR: ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2 px-2">
        <button onClick={onBack} className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-lg">
          <i className="fa-solid fa-chevron-left text-xs group-hover:-translate-x-1 transition-transform text-slate-400"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white">Back</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
           <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
           <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">Bot Status: Optimized</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 glass-panel rounded-[2.5rem] p-6 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-900/40">
        {messages.map((m, i) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[1.5rem] shadow-xl ${m.role === 'user' ? 'bg-cyan-500 text-black font-bold' : 'bg-slate-800 text-slate-200 border border-white/5'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-2xl flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-2 bg-slate-900/60 rounded-[2.2rem] border border-white/5 focus-within:border-cyan-500/50 transition-all shadow-2xl backdrop-blur-2xl">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Tanyakan sesuatu kepada Asisten Satmoko bot..."
          className="flex-1 bg-transparent px-6 py-4 focus:outline-none text-sm text-white"
        />
        <button onClick={handleSend} disabled={isTyping || !input.trim()} className="w-12 h-12 rounded-full bg-white text-black hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-50">
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};
