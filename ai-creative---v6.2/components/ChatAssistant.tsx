
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey } from '../lib/api';

interface ChatAssistantProps {
  onBack: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome = "Salam Master. Saya Asisten Neural Satmoko Studio. Link komunikasi sudah terenkripsi. Apa yang bisa saya bantu hari ini?";
    setMessages([{ role: 'assistant', text: welcome }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    const userMsg = input.trim();
    if (!userMsg || isTyping) return;
    
    // Validasi API Key menggunakan helper bypass
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setMessages(prev => [...prev, { role: 'assistant', text: "ERROR: Kunci AI tidak terdeteksi. Silakan hubungi Admin atau buka menu Security untuk memasukkan kunci bypass." }]);
      setInput('');
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      // Inisialisasi AI dengan kunci paling update
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const systemInstruction = "Anda adalah Asisten Cerdas Resmi Satmoko Studio. Panggil pengguna dengan sebutan 'Master'. Gunakan gaya bahasa yang berwibawa, profesional, dan sedikit sentuhan teknologi masa depan.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      const reply = response.text || "Maaf Master, terjadi gangguan pada transmisi data.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      console.error("AI Error Details:", e);
      const errorDetail = e?.message || "Kesalahan Protokol.";
      setMessages(prev => [...prev, { role: 'assistant', text: `SISTEM ERROR: ${errorDetail}. Master, cek Kunci AI di menu Security jika error berlanjut.` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const downloadHistory = () => {
    const content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.text}\n\n`).join('---\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satmoko_log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-220px)] gap-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Neural <span className="text-cyan-400">Assistant</span></h2>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mt-1">Status: Online • Hub v5.8</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadHistory} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-all shadow-xl">
            <i className="fa-solid fa-download text-xs"></i>
          </button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-12 h-12 rounded-2xl border transition-all flex items-center justify-center ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className="fa-solid fa-info text-xs"></i>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 glass-panel rounded-[3rem] p-8 space-y-8 overflow-y-auto no-scrollbar bg-slate-950/60 shadow-inner relative border-white/5">
        {messages.map((m, i) => (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-6 rounded-[2rem] shadow-2xl ${m.role === 'user' ? 'bg-cyan-600 text-white font-bold rounded-tr-none border border-cyan-400/30' : 'bg-[#1c232d] text-slate-200 border border-white/5 rounded-tl-none'}`}>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <p className="text-[7px] opacity-30 mt-3 uppercase tracking-widest font-black text-right">
                {m.role === 'user' ? 'MASTER' : 'NEURAL_NODE'}
              </p>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 ml-6">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-2.5 bg-slate-900/90 rounded-[2.5rem] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          placeholder="Kirim perintah ke AI..." 
          className="flex-1 bg-transparent px-8 py-5 focus:outline-none text-sm text-white placeholder:text-slate-700" 
        />
        <button 
          onClick={handleSend} 
          disabled={isTyping || !input.trim()} 
          className="w-14 h-14 rounded-full bg-white text-black hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-20 shadow-lg active:scale-90"
        >
          <i className="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  );
};
