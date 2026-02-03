
import React, { useState } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits } from '../lib/api';

interface VideoGeneratorProps {
  mode: 'img2vid' | 'text2vid';
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

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ mode, onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [bgPrompt, setBgPrompt] = useState(''); 
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const COST_VIDEO = 150;

  const t = {
    id: {
      guide: "Modul ini menggunakan engine Veo 3.1. Biaya: 150 Kredit per video.",
      title: "PANDUAN VIDEO",
      videoEngine: "Video Engine",
      noCredit: "KREDIT HABIS!",
      totalCharge: "TOTAL BIAYA RENDER"
    },
    en: {
      guide: "This suite leverages Veo 3.1. Cost: 150 Credits per video.",
      title: "CINEMATIC DOCUMENTATION",
      videoEngine: "Video Engine",
      noCredit: "CREDIT EXHAUSTED!",
      totalCharge: "TOTAL RENDER COST"
    }
  }[lang];

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => [...prev, { id, msg, type, time }]);
    if (processLogs.length > 5) setProcessLogs(prev => prev.slice(1));
  };

  const removeLog = (id: string) => {
    setProcessLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourceImages(prev => [...prev, reader.result as string].slice(-3));
          addLog("Aset visual ditambahkan.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const generateVideo = async () => {
    if (credits < COST_VIDEO) {
      addLog(t.noCredit, "error");
      return;
    }

    const aistudio = (window as any).aistudio;
    const hasKey = await aistudio.hasSelectedApiKey();
    if (!hasKey) {
      addLog("Peringatan: Veo butuh Project Berbayar (Paid).", "warning");
      await aistudio.openSelectKey();
    }

    setIsGenerating(true);
    setVideoUrl(null);
    addLog("Inisialisasi Cluster Video...");
    
    try {
      const success = await deductCredits(userEmail, COST_VIDEO);
      if (!success) {
        addLog("Gagal memproses kredit.", "error");
        setIsGenerating(false);
        return;
      }
      refreshCredits();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const isMultiImage = sourceImages.length > 1;
      const modelName = isMultiImage ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
      const actualRatio = isMultiImage ? '16:9' : aspectRatio;

      const finalPrompt = `${prompt} ${bgPrompt ? `dengan latar ${bgPrompt}` : ''}, high cinematic quality, 8k resolution, smooth motion.`;

      const referenceImagesPayload = sourceImages.map(img => ({
        image: {
          imageBytes: img.split(',')[1],
          mimeType: img.match(/data:([^;]+);/)?.[1] || 'image/png',
        },
        referenceType: VideoGenerationReferenceType.ASSET,
      }));

      let operation = await ai.models.generateVideos({
        model: modelName,
        prompt: finalPrompt,
        image: sourceImages.length === 1 ? {
          imageBytes: sourceImages[0].split(',')[1],
          mimeType: sourceImages[0].match(/data:([^;]+);/)?.[1] || 'image/png'
        } : undefined,
        config: { 
          numberOfVideos: 1, 
          resolution: '720p', 
          aspectRatio: actualRatio,
          referenceImages: isMultiImage ? referenceImagesPayload : undefined
        }
      });

      while (!operation.done) {
        addLog("Rendering Frame Master (1-3 Menit)...", "info");
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        addLog("Sinkronisasi Selesai.", "success");
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob as Blob));
        addLog("Master Video Siap (-150 CR).", "success");
      }
    } catch (e: any) { 
      const errorMsg = e?.message || JSON.stringify(e);
      addLog(`FAILURE: ${errorMsg.substring(0, 80)}`, "error");
    } finally { 
      setIsGenerating(false); 
      refreshCredits();
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="fixed top-6 right-6 z-[300] w-72 lg:w-80 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {processLogs.map((log) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: 50 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 300 }}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 50) removeLog(log.id); }}
              className={`pointer-events-auto cursor-grab active:cursor-grabbing p-4 rounded-2xl glass-panel border-l-4 backdrop-blur-2xl shadow-xl flex flex-col gap-1 ${log.type === 'error' ? 'border-l-red-500 bg-red-500/20' : 'border-l-cyan-500 bg-cyan-500/10'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[7px] font-black uppercase text-slate-500">{log.time}</span>
                <span className="text-[6px] opacity-30 uppercase font-black">Geser untuk tutup</span>
              </div>
              <p className="text-[10px] font-bold text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"><i className="fa-solid fa-arrow-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase">{t.videoEngine} <span className="text-cyan-500">Engine</span></h2>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Saldo Anda</p>
           <p className="text-xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-panel p-6 rounded-[2.5rem] border-cyan-500/20 bg-cyan-500/5 mb-2 shadow-2xl">
              <p className="text-[9px] font-black uppercase text-cyan-400 tracking-[0.4em] mb-3">{t.title}</p>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                {t.guide}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5 space-y-6">
          <section className="glass-panel p-8 rounded-[2.5rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Imajinasi Gerakan</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500/50" placeholder="Contoh: Orang sedang memegang produk macadamia..." />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Setting Latar (Opsional)</label>
              <input type="text" value={bgPrompt} onChange={e => setBgPrompt(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-cyan-500/50" placeholder="Misal: di meja dapur, kafe mewah..." />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Pilih Rasio</label>
              <div className="flex gap-2">
                <button onClick={() => setAspectRatio('16:9')} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${aspectRatio === '16:9' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'bg-black/20 border-white/5 text-slate-500'}`}>16:9 Landscape</button>
                <button onClick={() => setAspectRatio('9:16')} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${aspectRatio === '9:16' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'bg-black/20 border-white/5 text-slate-500'}`}>9:16 Portrait</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Aset Visual (Max 3)</label>
              <div className="grid grid-cols-3 gap-2">
                {sourceImages.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black relative">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-[8px] text-white flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
                {sourceImages.length < 3 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-all">
                    <i className="fa-solid fa-plus text-slate-700"></i>
                    <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </div>

            {/* Total Credit Deduct UI */}
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{t.totalCharge}</p>
                <p className="text-lg font-black italic text-white leading-none">{COST_VIDEO} <span className="text-[10px] text-slate-500">CR</span></p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sisa Saldo</p>
                <p className={`text-[11px] font-black ${credits < COST_VIDEO ? 'text-red-500' : 'text-slate-400'}`}>
                  {(credits - COST_VIDEO).toLocaleString()} CR
                </p>
              </div>
            </div>

            <button 
              onClick={generateVideo} 
              disabled={isGenerating || !prompt || credits < COST_VIDEO} 
              className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl hover:bg-cyan-400 transition-all shadow-xl active:scale-95 disabled:opacity-20"
            >
              {isGenerating ? "MENGOLAH FRAME..." : credits < COST_VIDEO ? t.noCredit : `MULAI RENDER VIDEO`}
            </button>
          </section>
        </div>

        <div className="xl:col-span-7">
          <div className="glass-panel min-h-[500px] rounded-[3rem] flex flex-col items-center justify-center p-8 bg-black/20 overflow-hidden shadow-2xl border-white/5">
            {videoUrl ? (
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center gap-6">
                <i className="fa-solid fa-clapperboard text-8xl"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.8em]">WAITING_FOR_INPUT</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
