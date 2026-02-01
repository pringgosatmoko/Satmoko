
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, isAdmin as checkAdmin } from '../lib/api';

interface VideoGeneratorProps {
  mode: 'img2vid' | 'text2vid';
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

const VIDEO_STYLES = [
  { id: 'cinematic', name: 'Realistic Cinematic', prompt: 'hyper-realistic cinematic video, 8k, movie shot, smooth camera movement, professional lighting' },
  { id: 'pixar', name: 'Disney Pixar', prompt: '3d animation, disney pixar style video, cute characters, vibrant colors, ray tracing, masterpiece' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', prompt: 'cyberpunk aesthetic video, futuristic city, high contrast, synthwave vibes, 8k' }
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ mode, onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [activeStyleId, setActiveStyleId] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [costVideo, setCostVideo] = useState(150);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => {
    getSystemSettings().then(s => setCostVideo(s.cost_video || 150));
  }, []);

  const handleKeySelection = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setShowKeyPicker(false);
      } catch (e) { console.error(e); }
    }
  };

  const generateVideo = async () => {
    setErrorMsg(null);

    // AI Studio Key Selection Check (Only if in AI Studio environment)
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyPicker(true);
        return;
      }
    }

    if (!prompt.trim() && sourceImages.length === 0) {
      setErrorMsg("MASUKKAN SKENARIO ANDA!");
      return;
    }

    if (!isAdmin && credits < costVideo) {
      setErrorMsg(`SALDO TIDAK CUKUP! BUTUH ${costVideo} CR.`);
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    
    try {
      if (!isAdmin) {
        const success = await deductCredits(userEmail, costVideo);
        if (!success) throw new Error("GAGAL MEMOTONG KREDIT.");
        refreshCredits();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const style = VIDEO_STYLES.find(s => s.id === activeStyleId) || VIDEO_STYLES[0];
      const finalPrompt = `${prompt}. Style: ${style.prompt}. High cinematic quality.`;

      const referenceImagesPayload = sourceImages.map(img => ({
        image: { imageBytes: img.split(',')[1], mimeType: 'image/png' },
        referenceType: VideoGenerationReferenceType.ASSET,
      }));

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: finalPrompt,
        config: { 
          numberOfVideos: 1, 
          resolution: '720p', 
          aspectRatio: aspectRatio as any, 
          referenceImages: referenceImagesPayload.length > 0 ? referenceImagesPayload : undefined 
        }
      });

      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      } else {
        throw new Error("MESIN TIDAK MENGEMBALIKAN DATA VIDEO.");
      }
    } catch (e: any) { 
      console.error("[NeuralHub] Video Error:", e);
      const msg = String(e?.message || "");
      if (msg.includes("Requested entity was not found.") && window.aistudio) {
        setShowKeyPicker(true);
      } else {
        setErrorMsg(msg.toUpperCase() || "KEGAGALAN PRODUKSI VIDEO.");
      }
    } finally { 
      setIsGenerating(false); 
      refreshCredits(); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white overflow-hidden">
      <header className="px-6 pt-6 flex items-center justify-between flex-shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center active:scale-90 transition-transform">
          <i className="fa-solid fa-chevron-left text-sm"></i>
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black italic tracking-tight uppercase">Video <span className="text-orange-500">Director</span></h1>
          <p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.4em]">Veo Engine v3.1</p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar flex flex-col items-center">
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 text-center">
              ERROR: {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {videoUrl ? (
          <div className="w-full space-y-6">
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-[2.5rem] shadow-2xl border border-white/10" />
            <div className="flex justify-center gap-4">
               <button onClick={() => setVideoUrl(null)} className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase">Project Baru</button>
               <a href={videoUrl} download="satmoko_video.mp4" className="px-8 py-3 bg-cyan-500 text-black rounded-full text-[10px] font-black uppercase">Simpan Video</a>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-10 flex flex-col items-center">
            <div className="text-center opacity-10 flex flex-col items-center pt-20">
              <i className="fa-solid fa-clapperboard text-8xl mb-6 text-orange-500"></i>
              <p className="text-[11px] font-black uppercase tracking-[1em]">Director Hub Ready</p>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 pb-12">
        <div className="bg-[#121212] rounded-[2.5rem] p-2.5 flex items-center gap-2 border border-white/5 shadow-2xl">
          <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateVideo()} placeholder="Tulis skenario Master..." className="flex-1 bg-transparent px-8 text-sm focus:outline-none text-white placeholder:text-slate-800 font-medium" />
          <button onClick={() => generateVideo()} disabled={isGenerating} className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-full flex items-center gap-3 transition-all active:scale-95 disabled:opacity-20 shadow-lg">
            <span className="text-xs font-black uppercase italic text-white">{isGenerating ? 'RENDER' : 'CREATE'}</span>
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showKeyPicker && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowKeyPicker(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-[#121212] border border-orange-500/30 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-6">
              <i className="fa-solid fa-lock-open text-orange-500 text-5xl mb-4"></i>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Otorisasi Billing</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Produksi Video membutuhkan kunci API Berbayar.</p>
              <button onClick={handleKeySelection} className="w-full py-5 bg-orange-500 text-black font-black uppercase rounded-2xl text-[10px]">HUBUNGKAN BILLING</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isGenerating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center">
          <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full mb-8 shadow-lg" />
          <p className="text-[11px] font-black text-orange-500 uppercase tracking-[0.6em] animate-pulse text-center px-10">Neural Production Active...</p>
        </div>
      )}
    </div>
  );
};
