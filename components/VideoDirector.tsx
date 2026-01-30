
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from '@google/genai';
import { deductCredits, getSystemSettings, rotateApiKey, isAdmin as checkAdmin, getActiveApiKey } from '../lib/api';

interface VideoSegment {
  number: number;
  duration: string;
  visualDescription: string;
  action: string;
  transitionNote: string;
  terminalCommand: string;
  videoUrl?: string | null;
  isRendering?: boolean;
}

interface VideoDirectorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

export const VideoDirector: React.FC<VideoDirectorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [story, setStory] = useState('');
  const [visualStyle, setVisualStyle] = useState('3D Animation, Pixar Style, High Detail, 4K');
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [costVideo, setCostVideo] = useState(150);
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => {
    getSystemSettings().then(s => setCostVideo(s.cost_video || 150));
  }, []);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => {
      const newLogs = [...prev, { id, msg, type, time }];
      return newLogs.length > 5 ? newLogs.slice(1) : newLogs;
    });
  };

  const handleKeySelection = async () => {
    try {
      await window.aistudio.openSelectKey();
      setShowKeyPicker(false);
      addLog("Kunci API Terpilih. Melanjutkan...", "success");
    } catch (e) {
      addLog("Gagal Memilih Kunci.", "error");
    }
  };

  const handleBreakdown = async (retryCount = 0) => {
    if (!story.trim()) return;
    setIsAnalyzing(true);
    addLog("Sutradara AI sedang membedah naskah...", "info");

    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const systemInstruction = `Role: AI Video Director. Task: Breakdown story into 8s segments. Style: ${visualStyle}. Output JSON.`;
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: `Breakdown this story: \n\n${story}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                duration: { type: Type.STRING },
                visualDescription: { type: Type.STRING },
                action: { type: Type.STRING },
                transitionNote: { type: Type.STRING },
                terminalCommand: { type: Type.STRING }
              }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '[]');
      setSegments(data.map((seg: any) => ({ ...seg, videoUrl: null, isRendering: false })));
      addLog(`Berhasil memecah cerita menjadi ${data.length} segmen.`, "success");
    } catch (e: any) {
      if ((e.message?.includes('429')) && retryCount < 1) { rotateApiKey(); return handleBreakdown(retryCount + 1); }
      addLog(`Gagal Analisis: ${e.message}`, "error");
    } finally { setIsAnalyzing(false); }
  };

  const renderSegment = async (index: number, retryCount = 0) => {
    // Paid Key Check
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowKeyPicker(true);
      return;
    }

    if (!isAdmin && credits < costVideo && retryCount === 0) return addLog("Kredit Tidak Cukup!", "error");
    
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, isRendering: true } : s));
    addLog(`Merender Segmen #${index + 1}...`, "info");

    try {
      if (retryCount === 0 && !isAdmin) { await deductCredits(userEmail, costVideo); refreshCredits(); }

      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const seg = segments[index];
      const fullPrompt = `${seg.visualDescription}. Style: ${visualStyle}. Action: ${seg.action}`;

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const resp = await fetch(`${uri}&key=${getActiveApiKey()}`);
        const blob = await resp.blob();
        setSegments(prev => prev.map((s, i) => i === index ? { ...s, videoUrl: URL.createObjectURL(blob), isRendering: false } : s));
        addLog(`Segmen #${index + 1} Selesai!`, "success");
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('403')) {
        addLog("Error 403: Butuh Paid API Key.", "error");
        setShowKeyPicker(true);
      }
      setSegments(prev => prev.map((s, i) => i === index ? { ...s, isRendering: false } : s));
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Existing Header... */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Video <span className="text-orange-500">Director</span></h2>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo Master</p>
           <p className="text-xl font-black italic text-cyan-400 leading-none">{isAdmin ? '∞' : credits.toLocaleString()} CR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-2 border-orange-500/40">
            <textarea 
              value={story} 
              onChange={e => setStory(e.target.value)} 
              className="w-full h-80 bg-black/40 border border-white/10 rounded-[2.5rem] p-6 text-sm text-white focus:border-orange-500/30 outline-none resize-none"
              placeholder="Masukkan cerita Master..."
            />
            <button onClick={() => handleBreakdown()} disabled={isAnalyzing} className="w-full py-5 bg-orange-600 text-white font-black uppercase rounded-2xl shadow-xl active:scale-95 text-xs tracking-widest">
              {isAnalyzing ? "Analyzing..." : "Breakdown Skenario"}
            </button>
          </section>
        </div>
        <div className="lg:col-span-8 space-y-6">
          {segments.map((seg, idx) => (
             <div key={idx} className="glass-panel p-8 rounded-[3rem] bg-[#0d1117] border border-white/5 flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                   <h4 className="text-sm font-black text-white italic tracking-widest uppercase">Segmen #{seg.number}</h4>
                   <p className="text-[11px] text-slate-400 italic leading-relaxed">"{seg.visualDescription}"</p>
                </div>
                <div className="w-full md:w-64 flex flex-col gap-4">
                   <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-white/10">
                      {seg.videoUrl && <video src={seg.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />}
                      {seg.isRendering && <div className="absolute inset-0 bg-black/80 flex items-center justify-center animate-pulse text-[10px] text-orange-500 font-black">RENDERING...</div>}
                   </div>
                   <button onClick={() => renderSegment(idx)} disabled={seg.isRendering} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl text-[9px] tracking-widest">
                     {seg.videoUrl ? "✓ Selesai" : "Render Segmen"}
                   </button>
                </div>
             </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showKeyPicker && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowKeyPicker(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-[#121212] border border-orange-500/30 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-6 shadow-[0_0_80px_rgba(249,115,22,0.1)]">
              <i className="fa-solid fa-lock-open text-orange-500 text-5xl mb-4"></i>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Otorisasi Billing</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Produksi Video membutuhkan kunci API Berbayar. Hubungkan kunci Master sekarang untuk melanjutkan.</p>
              <button onClick={handleKeySelection} className="w-full py-5 bg-orange-500 text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 text-[10px]">PILIH KUNCI BERBAYAR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
