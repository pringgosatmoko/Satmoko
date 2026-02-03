
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey, rotateApiKey } from '../lib/api';

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
    const welcome = "Halo Master! Saya asisten pintar Satmoko Studio. Saya sudah menguasai seluruh fitur di dalam aplikasi ini. Apa yang bisa saya bantu buatkan hari ini? Naskah video panjang? Konsep iklan? Atau deskripsi gambar?";
    setMessages([{ role: 'assistant', text: welcome }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (retryCount = 0) => {
    const userMsg = input.trim();
    if (!userMsg && retryCount === 0) return;
    if (isTyping && retryCount === 0) return;
    
    if (retryCount === 0) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    }
    
    setIsTyping(true);

    try {
      const apiKey = getActiveApiKey();
      if (!apiKey) throw new Error("Kunci akses tidak ditemukan.");

      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `Anda adalah Asisten Pintar Satmoko Studio Creative. 
Gaya bicara: Ramah, cerdas, solutif, dan memanggil pengguna dengan sebutan "Master".

PENGETAHUAN PRODUK (Mastering our features):
1. **Video Director**: Fitur paling canggih untuk bikin video panjang. Saya memecah naskah Master menjadi segmen 8 detik dengan konsistensi visual (Continuity). Ada fitur "Transition Note" agar video tidak patah-patah.
2. **Tanya AI (Chat)**: Tempat Master berdiskusi dengan saya (Asisten Pintar) untuk brainstorming ide.
3. **Buat Gambar (Visual Art)**: Buat gambar resolusi 8K (Image Gen). Mendukung gaya nyata, 3D, atau anime.
4. **Bikin Video (Video FX)**: Membuat video sinematik dari teks atau gambar. Mendukung aspect ratio 16:9 dan 9:16.
5. **Kloning Suara (Voice Clone)**: Mengubah teks jadi suara manusia nyata (TTS). Ada suara Zephyr, Kore, Puck, dan Fenrir.
6. **Studio Iklan (Pro)**: Sistem otomatis bikin iklan. Master cukup masukkan konsep, saya buatkan storyboard, suara, dan videonya sekaligus.
7. **Papan Cerita (Storyboard to Video)**: Master buat naskah, saya gambar per adegan (keyframes) lalu render jadi video utuh.
8. **Chat Pribadi (P2P Hub)**: Fitur kirim pesan langsung antar member atau ke Admin.

Tugas Anda: Membantu Master memaksimalkan fitur-fitur di atas. Jika Master ingin membuat video panjang, arahkan ke Video Director. Jika Master ingin gambar cantik, beri prompt yang bagus untuk fitur Buat Gambar.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: retryCount === 0 ? userMsg : messages[messages.length - 1].text,
        config: { systemInstruction: systemInstruction },
      });

      const reply = response.text || "Maaf Master, ada sedikit gangguan koneksi. Bisa diulangi?";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      console.error("AI Error:", e);
      if (e.message?.includes('429') && retryCount < 2) {
        rotateApiKey(); 
        handleSend(retryCount + 1); 
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: `SISTEM ERROR: ${e.message || "Gagal menghubungi otak AI."}` }]);
      }
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
    a.download = `riwayat_chat_satmoko_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-220px)] gap-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Tanya <span className="text-cyan-400">AI</span></h2>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mt-1">Status: Siap Melayani</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadHistory} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-all shadow-xl" title="Simpan Chat">
            <i className="fa-solid fa-download text-xs"></i>
          </button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-12 h-12 rounded-2xl border transition-all flex items-center justify-center ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className="fa-solid fa-info text-xs"></i>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 glass-panel rounded-[3rem] p-8 space-y-8 overflow-y-auto custom-scrollbar bg-slate-950/60 shadow-inner border-white/5">
        {messages.map((m, i) => (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-6 rounded-[2rem] shadow-2xl ${m.role === 'user' ? 'bg-cyan-600 text-white font-bold rounded-tr-none border border-cyan-400/30' : 'bg-[#1c232d] text-slate-200 border border-white/5 rounded-tl-none'}`}>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
              <p className="text-[7px] opacity-30 mt-3 uppercase tracking-widest font-black text-right">{m.role === 'user' ? 'MASTER' : 'ASISTEN PINTAR'}</p>
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
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(0)} placeholder="Tulis pesan untuk AI di sini..." className="flex-1 bg-transparent px-8 py-5 focus:outline-none text-sm text-white" />
        <button onClick={() => handleSend(0)} disabled={isTyping || !input.trim()} className="w-14 h-14 rounded-full bg-white text-black hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-20 shadow-lg active:scale-90">
          <i className="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  );
};
