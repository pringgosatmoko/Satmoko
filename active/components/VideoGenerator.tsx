
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey } from '../lib/api';

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
  const [loadingStep, setLoadingStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [costVideo, setCostVideo] = useState(150);
  const [hasUserKey, setHasUserKey] = useState<boolean | null>(null);

  const loadingMessages = [
    "Menghubungkan ke Neural Engine...",
    "Menganalisis Konsistensi Visual...",
    "Sintesis Frame Tahap Awal...",
    "Merender Tekstur & Cahaya...",
    "Memperhalus Gerakan AI...",
    "Finalisasi Paket Data MP4...",
    "Mengunduh Hasil Akhir..."
  ];

  useEffect(() => {
    getSystemSettings().then(s => setCostVideo(s.cost_video || 150));
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    if (!(window as any).aistudio) {
      setHasUserKey(true);
      return;
    }
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasUserKey(hasKey);
    } catch (e) {
      setHasUserKey(true);
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
    }
    setHasUserKey(true);
  };

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 15000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const t = {
    id: {
      guide: "Modul ini menggunakan sistem Veo 3.1. Fitur Video membutuhkan API Key berbayar milik Anda sendiri agar dapat berjalan stabil.",
      title: "PANDUAN VIDEO",
      videoEngine: "Buat Video",
      noCredit: "SALDO TIDAK CUKUP!",
      totalCharge: "TOTAL BIAYA PEMROSESAN",
      keyRequired: "API KEY BERBAYAR DIBUTUHKAN",
      keyDesc: "Model Veo 3.1 memerlukan API Key dari proyek dengan Billing aktif milik Master.",
      selectKey: "HUBUNGKAN API KEY SAYA",
      billingDocs: "Pelajari tentang Penagihan",
      resetKey: "Ganti/Pilih Ulang Key",
      download: "UNDUH VIDEO FINAL",
      ready: "VIDEO SIAP DITAMPILKAN"
    },
    en: {
      guide: "This suite leverages Veo 3.1. Video features require your own paid API Key for stable performance.",
      title: "VIDEO GUIDE",
      videoEngine: "Create Video",
      noCredit: "CREDIT EXHAUSTED!",
      totalCharge: "TOTAL PROCESSING COST",
      keyRequired: "PAID API KEY REQUIRED",
      keyDesc: "Veo 3.1 model requires an API Key from a project with active Billing.",
      selectKey: "SELECT YOUR API KEY",
      billingDocs: "About Gemini Billing",
      resetKey: "Reset/Change API Key",
      download: "DOWNLOAD FINAL VIDEO",
      ready: "VIDEO READY TO VIEW"
    }
  }[lang];

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => {
      const newLogs = [...prev, { id, msg, type, time }];
      return newLogs.length > 5 ? newLogs.slice(1) : newLogs;
    });
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
          addLog("Gambar berhasil diunggah.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const generateVideo = async (retryCount = 0) => {
    if (credits < costVideo && retryCount === 0) {
      addLog(t.noCredit, "error");
      return;
    }

    setIsGenerating(true);
    if (retryCount === 0) setVideoUrl(null);
    addLog("Memulai pemrosesan video sinematik...");
    
    try {
      if (retryCount === 0) {
        const success = await deductCredits(userEmail, costVideo);
        if (!success) {
          addLog("Saldo Anda tidak mencukupi.", "error");
          setIsGenerating(false);
          return;
        }
        refreshCredits();
      }

      const apiKey = process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const isMultiImage = sourceImages.length > 1;
      const modelName = isMultiImage ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
      const actualRatio = isMultiImage ? '16:9' : aspectRatio;

      const finalPrompt = `${prompt} ${bgPrompt ? `dengan latar ${bgPrompt}` : ''}. Cinematic quality, 4k, fluid motion.`;
      
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
           mimeType: sourceImages[0].match(/data:([^;]+);/)?.[1] || 'image/png',
        } : undefined,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: actualRatio as any,
          referenceImages: isMultiImage ? referenceImagesPayload : undefined
        }
      });

      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        addLog("Video Berhasil Dirender!", "success");
      }

    } catch (e: any) {
      const errorMsg = e.message || "";
      if (errorMsg.includes('429') && retryCount < 2) {
        rotateApiKey();
        setTimeout(() => generateVideo(retryCount + 1), 2000);
      } else {
        addLog(`Gagal: ${errorMsg}`, "error");
      }
    } finally {
      setIsGenerating(false);
      refreshCredits();
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 relative pb-40">
      <div className="fixed top-6 right-6 z-[400] w-72 lg:w-80 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {processLogs.map((log) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: 50 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className={`p-4 rounded-2xl glass-panel border-l-4 shadow-2xl flex flex-col gap-1 backdrop-blur-3xl pointer-events-auto ${log.type === 'success' ? 'border-l-cyan-500 bg-cyan-500/10' : log.type === 'error' ? 'border-l-red-500 bg-red-500/20' : 'border-l-white/20 bg-white/5'}`}
            >
              <p className="text-[10px] font-bold text-white leading-tight">{log.msg}</p>
              <span className="text-[7px] text-slate-500 uppercase font-black">{log.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <div className="flex items-center gap-4 lg:gap-6">
          <button onClick={onBack} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[12px]`}></i>
          </button>
          <div>
            <h2 className="text-xl lg:text-4xl font-black italic uppercase tracking-tighter leading-none">Video <span className="text-cyan-400">Director</span></h2>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1 lg:mt-2">VEO_3.1_ULTRA_ENGINE • SATMOKO_HUB</p>
          </div>
        </div>
        <div className="text-right px-4 lg:px-6 py-2 lg:py-3 bg-white/5 border border-white/5 rounded-2xl lg:rounded-3xl">
          <p className="text-[7px] lg:text-[8px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">SALDO ANDA</p>
          <p className="text-sm lg:text-2xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-panel p-8 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 mb-4 shadow-2xl">
               <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-3">{t.title}</p>
               <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-line">
                 {t.guide}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        <div className="lg:w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 flex-shrink-0">
          <section className="glass-panel p-8 rounded-[3rem] space-y-6 bg-slate-900/40 border-white/5 shadow-2xl">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.2em] px-2">Gambar Referensi (Maks 3)</label>
              <div className="grid grid-cols-3 gap-3">
                {sourceImages.map((img, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black relative group shadow-xl">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setSourceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <i className="fa-solid fa-trash text-white text-xs"></i>
                    </button>
                  </div>
                ))}
                {sourceImages.length < 3 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-slate-700 hover:text-cyan-500">
                    <i className="fa-solid fa-plus text-lg"></i>
                    <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Rasio Aspek</label>
              <div className="grid grid-cols-2 gap-2">
                {['16:9', '9:16'].map(r => (
                  <button key={r} onClick={() => setAspectRatio(r as any)} className={`py-3 rounded-xl text-[9px] font-black border transition-all ${aspectRatio === r ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black/20 border-white/5 text-slate-600'}`}>{r} RATIO</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Perintah Gerakan (Prompt)</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-[2.5rem] p-6 text-sm text-white focus:border-cyan-500/50 outline-none resize-none leading-relaxed shadow-inner" placeholder="Jelaskan gerakan video yang Master inginkan..." />
            </div>

            <div className="p-6 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{t.totalCharge}</p>
                <p className="text-2xl font-black italic text-white leading-none">{costVideo} <span className="text-[10px] text-slate-500">CR</span></p>
              </div>
            </div>
            
            <button 
              onClick={() => generateVideo()} 
              disabled={isGenerating || !prompt.trim() || credits < costVideo} 
              className="w-full py-6 bg-white text-black font-black uppercase rounded-[2rem] hover:bg-cyan-400 transition-all shadow-2xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 text-[11px] tracking-widest"
            >
              {isGenerating ? "MENGAKTIFKAN NEURAL ENGINE..." : t.videoEngine}
            </button>
          </section>
        </div>

        <div className="flex-1 min-w-0">
          <div className="glass-panel h-full rounded-[4rem] flex flex-col items-center justify-center p-12 bg-black/30 border-white/5 shadow-2xl overflow-hidden relative">
            {videoUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group w-full max-w-4xl aspect-video rounded-[3rem] overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                 </motion.div>
                 <div className="flex gap-4">
                    <a href={videoUrl} download="satmoko_video.mp4" className="px-10 py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl shadow-xl hover:bg-white transition-all text-xs tracking-widest">{t.download}</a>
                    <button onClick={() => setVideoUrl(null)} className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black uppercase rounded-2xl hover:bg-red-500 transition-all text-xs tracking-widest">RESET</button>
                 </div>
              </div>
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center">
                <i className="fa-solid fa-clapperboard text-[120px] mb-10"></i>
                <p className="text-xl font-black uppercase tracking-[1.2em]">WAITING FOR PRODUCTION</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl z-30 flex flex-col items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border-8 border-cyan-500 border-t-transparent rounded-full mb-8 shadow-[0_0_40px_rgba(34,211,238,0.5)]" />
                <p className="text-xl font-black text-white uppercase tracking-[0.5em] animate-pulse">{loadingMessages[loadingStep]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
