
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey, getActiveApiKey, isAdmin as checkAdmin } from '../lib/api';

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
  { id: 'ghibli', name: 'Studio Ghibli', prompt: 'studio ghibli hand-drawn anime aesthetic video, nostalgic, lush environments, high quality' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', prompt: 'cyberpunk aesthetic video, futuristic city, high contrast, synthwave vibes, 8k' },
  { id: 'horror', name: 'Dark Horror', prompt: 'found footage horror video, shaky camera, dark atmosphere, eerie, cinematic suspense' }
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ mode, onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [activeStyleId, setActiveStyleId] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [engineType, setEngineType] = useState<'Standard' | 'High Quality'>('Standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [costVideo, setCostVideo] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => {
    getSystemSettings().then(s => setCostVideo(s.cost_video || 150));
  }, []);

  const selectedStyle = VIDEO_STYLES.find(s => s.id === activeStyleId) || VIDEO_STYLES[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourceImages(prev => {
            if (prev.length >= 3) return prev;
            return [...prev, reader.result as string];
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleKeySelection = async () => {
    try {
      await window.aistudio.openSelectKey();
      setShowKeyPicker(false);
    } catch (e) {
      console.error("Gagal Memilih Kunci.");
    }
  };

  const generateVideo = async (retryCount = 0) => {
    setErrorMsg(null);

    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowKeyPicker(true);
      return;
    }

    if (!prompt.trim() && sourceImages.length === 0) {
      setErrorMsg("MASUKKAN DESKRIPSI VIDEO ANDA!");
      return;
    }

    if (!isAdmin && credits < costVideo) {
      setErrorMsg(`SALDO TIDAK CUKUP! BUTUH ${costVideo} CR.`);
      return;
    }

    setIsGenerating(true);
    if (retryCount === 0) setVideoUrl(null);
    
    try {
      if (retryCount === 0 && !isAdmin) {
        const success = await deductCredits(userEmail, costVideo);
        if (!success) throw new Error("GAGAL MEMOTONG KREDIT. SILAKAN TOPUP.");
        refreshCredits();
      }

      // FIX: Gunakan getActiveApiKey() bukan process.env.API_KEY
      const currentApiKey = getActiveApiKey();
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      
      const finalPrompt = `${prompt}. Style: ${selectedStyle.prompt}. Video should be high quality, seamless motion, and cinematic.`;

      const referenceImagesPayload = sourceImages.map(img => ({
        image: { imageBytes: img.split(',')[1], mimeType: 'image/png' },
        referenceType: VideoGenerationReferenceType.ASSET,
      }));

      const modelName = engineType === 'High Quality' || sourceImages.length > 1 
        ? 'veo-2.0-generate-preview'
        : 'veo-2.0-fast-generate-preview';

      let operation = await ai.models.generateVideos({
        model: modelName,
        prompt: finalPrompt,
        image: sourceImages.length === 1 ? { imageBytes: sourceImages[0].split(',')[1], mimeType: 'image/png' } : undefined,
        config: { 
          numberOfVideos: 1, 
          resolution: engineType === 'High Quality' ? '1080p' : '720p', 
          aspectRatio: aspectRatio as any, 
          referenceImages: sourceImages.length > 1 ? referenceImagesPayload : undefined 
        }
      });

      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) throw operation.error;
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        // FIX: Tambahkan API key aktif saat fetch video data
        const response = await fetch(`${uri}&key=${currentApiKey}`);
        const responseBlob = await response.blob();
        setVideoUrl(URL.createObjectURL(responseBlob));
      } else {
        throw new Error("MESIN TIDAK MENGEMBALIKAN DATA VIDEO.");
      }
    } catch (e: any) { 
      console.error("[NeuralHub] Video Error:", e);
      const msg = String(e?.message || JSON.stringify(e) || "");
      
      if (msg.includes("Requested entity was not found.")) {
         setShowKeyPicker(true);
      } else if ((msg.includes('429') || msg.includes('quota') || msg.includes('403')) && retryCount < 4) { 
        rotateApiKey(); 
        return generateVideo(retryCount + 1); 
      } else {
        setErrorMsg(msg.toUpperCase() || "KEGAGALAN PRODUKSI VIDEO.");
      }
    } finally { setIsGenerating(false); refreshCredits(); }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white overflow-hidden">
      <header className="px-6 pt-6 flex flex-col items-center flex-shrink-0">
        <div className="w-full flex justify-between items-center mb-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center active:scale-90 transition-transform">
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <div className="flex bg-[#121212] rounded-full p-1 border border-white/5">
            <button onClick={onBack} className="px-5 py-1.5 rounded-full text-xs font-bold text-slate-500"><i className="fa-solid fa-image"></i></button>
            <button className="px-5 py-1.5 rounded-full bg-[#222222] text-xs font-bold"><i className="fa-solid fa-video"></i></button>
          </div>
          <button onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center text-orange-400 active:scale-90 transition-transform">
            <i className="fa-solid fa-question text-sm"></i>
          </button>
        </div>
        <h1 className="text-3xl font-black mb-1 tracking-tight uppercase italic">Video <span className="text-orange-500">Director</span></h1>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Cinematic Veo Production</p>
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
          <div className="w-full space-y-10">
            <div className="grid grid-cols-2 gap-4">
              {sourceImages.map((img, i) => (
                <div key={i} className="aspect-video rounded-[1.5rem] overflow-hidden relative border border-white/10 group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setSourceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark text-xs"></i></button>
                </div>
              ))}
              {sourceImages.length < 3 && (
                <label className="aspect-video rounded-[1.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 bg-[#0a0a0a]">
                  <i className="fa-solid fa-plus text-slate-700 text-xl mb-1"></i>
                  <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Add Reference</span>
                  <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                </label>
              )}
            </div>
            <div className="text-center opacity-10 flex flex-col items-center pt-20">
              <i className="fa-solid fa-clapperboard text-8xl mb-6 text-orange-500"></i>
              <p className="text-[11px] font-black uppercase tracking-[1em]">Director Hub Ready</p>
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 pb-12">
        <div className="bg-[#121212] rounded-[2.5rem] p-2.5 flex items-center gap-2 border border-white/5 shadow-2xl">
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-[#1c1c1c] flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
            <i className="fa-solid fa-sliders"></i>
          </button>
          <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && generateVideo()} placeholder="Tulis skenario Master..." className="flex-1 bg-transparent px-4 text-sm focus:outline-none text-white placeholder:text-slate-800 font-medium" />
          <button onClick={() => generateVideo()} disabled={isGenerating} className="bg-orange-500 hover:bg-orange-600 px-6 py-4 rounded-full flex items-center gap-3 shadow-[0_0_25px_rgba(249,115,22,0.4)] transition-all active:scale-95 disabled:opacity-20">
            <span className="text-xs font-black uppercase italic text-white">{isGenerating ? 'RENDER' : 'CREATE'}</span>
            {!isGenerating && <span className="text-[11px] font-black text-white/80">{isAdmin ? '0' : costVideo}</span>}
          </button>
        </div>
      </footer>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[500] flex flex-col justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative bg-[#0a0a0a] rounded-t-[3rem] px-8 pt-12 pb-16 border-t border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <div className="w-10"></div>
                <h2 className="text-xl font-black uppercase italic tracking-widest text-white">PRODUCTION SETTINGS</h2>
                <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-[#1c1c1c] rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="space-y-4">
                <SettingRow icon="fa-microchip" label="Neural Engine" value={engineType} onClick={() => setEngineType(engineType === 'Standard' ? 'High Quality' : 'Standard')} />
                <SettingRow icon="fa-palette" label="Preset Style" value={selectedStyle.name} onClick={() => { 
                    const currentIdx = VIDEO_STYLES.findIndex(s => s.id === activeStyleId);
                    const nextIdx = (currentIdx + 1) % VIDEO_STYLES.length; 
                    setActiveStyleId(VIDEO_STYLES[nextIdx].id); 
                  }} />
                <SettingRow icon="fa-square-full" label="Aspect Ratio" value={aspectRatio} onClick={() => setAspectRatio(aspectRatio === '16:9' ? '9:16' : '16:9')} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {isGenerating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center">
          <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full mb-8 shadow-lg" />
          <p className="text-[11px] font-black text-orange-500 uppercase tracking-[0.6em] animate-pulse text-center px-10">Neural Production Active...<br/><span className="text-[8px] text-white opacity-40 italic uppercase tracking-widest">MENGONSTRUKSI SINEMATIK VEO ({engineType})</span></p>
        </div>
      )}
    </div>
  );
};

const SettingRow = ({ icon, label, value, onClick }: { icon: string, label: string, value: string, onClick?: () => void }) => (
  <button onClick={onClick} className="w-full bg-[#121212] p-6 rounded-[1.8rem] flex items-center justify-between border border-white/5 active:bg-white/10 transition-all">
    <div className="flex items-center gap-4"><i className={`fa-solid ${icon} text-slate-500 w-5 text-center`}></i><span className="text-sm font-bold text-slate-200">{label}</span></div>
    <div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-500 uppercase">{value}</span>{onClick && <i className="fa-solid fa-chevron-right text-[10px] text-slate-800"></i>}</div>
  </button>
);
