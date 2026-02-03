
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits } from '../lib/api';

interface StoryboardItem {
  scene: string;
  label?: string;
  visual: string;
  audio: string;
  duration: number;
  speaker: 'Laki-laki' | 'Perempuan';
  voicePreset: string;
  transition: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  endFrame?: string | null;
  isRendering?: boolean;
  isAudioLoading?: boolean;
}

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

interface StudioCreatorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const StudioCreator: React.FC<StudioCreatorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<'General' | 'Iklan'>('Iklan');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [videoStyle, setVideoStyle] = useState('Disney Pixar');
  const [maleModel, setMaleModel] = useState('Zephyr');
  const [femaleModel, setFemaleModel] = useState('Kore');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [globalEndFrame, setGlobalEndFrame] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'story'>('input');
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>([]);
  const [charBio, setCharBio] = useState(''); 
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  const COST_VIDEO_SCENE = 150;
  // AI biasanya menghasilkan 4 adegan untuk struktur iklan
  const ESTIMATED_SCENES = 4;
  const estimatedTotalCost = ESTIMATED_SCENES * COST_VIDEO_SCENE;
  const actualTotalCost = storyboard.length * COST_VIDEO_SCENE;

  const t = {
    id: {
      guide: "Studio Pro pipeline otomatis pembuatan iklan. Biaya: 150 CR per render visual.",
      title: "PRODUKSI IKLAN",
      studioPro: "Studio Pro",
      noCredit: "KREDIT HABIS!",
      totalProjectEst: "ESTIMASI TOTAL PROYEK",
      setupEst: "ESTIMASI BIAYA PRODUKSI (4 ADEGAN)"
    },
    en: {
      guide: "Automated commercial production pipeline. Cost: 150 CR per visual render.",
      title: "PRODUCTION MANUAL",
      studioPro: "Studio Pro",
      noCredit: "CREDIT EXHAUSTED!",
      totalProjectEst: "TOTAL PROJECT ESTIMATE",
      setupEst: "PRODUCTION COST ESTIMATE (4 SCENES)"
    }
  }[lang];

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => [...prev, { id, msg, type, time }]);
  };

  const removeLog = (id: string) => {
    setProcessLogs(prev => prev.filter(log => log.id !== id));
  };

  const stylePresets = [
    { name: 'Disney Pixar', prompt: 'Disney Pixar 3D animation style, cinematic lighting, vibrant' },
    { name: 'Realistic', prompt: 'Cinematic photorealism, high detail, 8k, natural movement' },
    { name: 'Anime', prompt: 'Modern high-quality anime, vibrant colors, clean lines' }
  ];

  const voiceOptions = {
    male: ['Zephyr', 'Fenrir', 'Charon'],
    female: ['Kore', 'Puck']
  };

  const handleRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRefImages(prev => [...prev, reader.result as string].slice(0, 2));
          addLog("Aset visual ditambahkan.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const decodeBase64Audio = async (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    
    const wavBlob = await new Promise<Blob>((resolve) => {
      const worker = new Worker(URL.createObjectURL(new Blob([`
        onmessage = function(e) {
          const buffer = e.data;
          const length = buffer.length * 2;
          const view = new DataView(new ArrayBuffer(44 + length));
          const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
          };
          writeString(0, 'RIFF');
          view.setUint32(4, 36 + length, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true); view.setUint16(20, 1, true);
          view.setUint16(22, 1, true); view.setUint32(24, 24000, true);
          view.setUint32(28, 48000, true); view.setUint16(32, 2, true);
          view.setUint16(34, 16, true); writeString(36, 'data');
          view.setUint32(40, length, true);
          for (let i = 0; i < buffer.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buffer[i])) * 0x7FFF, true);
          postMessage(new Blob([view], { type: 'audio/wav' }));
        }
      `], { type: 'application/javascript' })));
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage(channelData);
    });
    return URL.createObjectURL(wavBlob);
  };

  const constructProject = async () => {
    setIsProcessing(true);
    addLog(`Membangun Storyboard ${projectType}...`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageParts = refImages.map(img => ({
        inlineData: { data: img.split(',')[1], mimeType: img.match(/data:([^;]+);/)?.[1] || 'image/png' }
      }));

      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: "Analisis visual subjek/produk ini secara mendalam untuk konsistensi video." }, ...imageParts] }]
      });

      const masterBio = analysisResponse.text || '';
      setCharBio(masterBio);
      
      const selectedStyle = stylePresets.find(s => s.name === videoStyle);
      
      let structurePrompt = projectType === 'Iklan' 
        ? "WAJIB STRUKTUR IKLAN 4 ADEGAN: 1. Hook (Masalah/Kebutuhan), 2. Problem (Dampak), 3. Solution (Produk), 4. CTA (Ajakan)."
        : "Buat alur cerita kreatif dengan narasi yang mendalam.";

      let systemPrompt = `Role: Creative Director. Project: "${title}".
      Tipe: ${projectType}. ${structurePrompt}
      DURASI: ${totalDuration}s. STYLE: ${selectedStyle?.prompt}.
      MODEL SUARA 1 (Laki-laki): ${maleModel}. MODEL SUARA 2 (Perempuan): ${femaleModel}.
      
      Hasilkan JSON ARRAY 4 adegan. Tiap adegan: scene (judul), visual (prompt video), audio (naskah bicara), duration (angka), speaker (Laki-laki/Perempuan), voicePreset (Laki-laki=${maleModel}, Perempuan=${femaleModel}), transition (efek).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: systemPrompt,
        config: { 
          responseMimeType: "application/json", 
          responseSchema: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                scene: { type: Type.STRING }, 
                visual: { type: Type.STRING }, 
                audio: { type: Type.STRING }, 
                duration: { type: Type.NUMBER },
                speaker: { type: Type.STRING }, 
                voicePreset: { type: Type.STRING },
                transition: { type: Type.STRING } 
              }
            } 
          } 
        }
      });

      const data = JSON.parse(response.text || '[]');
      setStoryboard(data.map((item: any, idx: number) => ({ 
        ...item, 
        videoUrl: null, 
        audioUrl: null, 
        endFrame: idx === data.length - 1 ? globalEndFrame : null,
        isRendering: false, 
        isAudioLoading: false
      })));
      setStep('story');
      addLog("Storyboard Iklan Siap.", "success");
    } catch (e: any) { 
      addLog(`ERR: ${e.message}`, "error");
    } finally { 
      setIsProcessing(false); 
    }
  };

  const generateAudio = async (index: number) => {
    const item = storyboard[index];
    addLog(`Syncing Neural Audio Scene ${index + 1}...`);
    const updated = [...storyboard]; updated[index].isAudioLoading = true; setStoryboard(updated);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts", 
        contents: [{ parts: [{ text: item.audio }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: item.voicePreset } } }
        }
      });
      const base64Audio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = await decodeBase64Audio(base64Audio);
        const final = [...storyboard]; final[index].audioUrl = audioUrl; final[index].isAudioLoading = false;
        setStoryboard(final); addLog(`Audio Scene ${index + 1} Berhasil.`, "success");
      }
    } catch (e: any) { addLog("Kegagalan Audio Node.", "error"); }
  };

  const renderVideo = async (index: number) => {
    if (credits < COST_VIDEO_SCENE) return addLog(t.noCredit, "error");
    const item = storyboard[index]; 
    addLog(`Rendering Video Scene ${index + 1}...`);
    const newStoryboard = [...storyboard]; newStoryboard[index].isRendering = true; setStoryboard(newStoryboard);
    
    try {
      const success = await deductCredits(userEmail, COST_VIDEO_SCENE);
      if (!success) {
        addLog("Kredit tidak cukup.", "error");
        const reset = [...storyboard]; reset[index].isRendering = false; setStoryboard(reset);
        return;
      }
      refreshCredits();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const selectedStyle = stylePresets.find(s => s.name === videoStyle);
      const prompt = `${item.visual}. Style: ${selectedStyle?.prompt}. Subject: ${charBio}. Action: ${item.transition}.`;
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview', 
        prompt,
        image: refImages[0] ? { imageBytes: refImages[0].split(',')[1], mimeType: 'image/png' } : undefined,
        config: { 
          numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio,
          lastFrame: item.endFrame ? { imageBytes: item.endFrame.split(',')[1], mimeType: 'image/png' } : undefined
        }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const resp = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const blob = await resp.blob();
        const updated = [...storyboard]; updated[index].videoUrl = URL.createObjectURL(blob as Blob); updated[index].isRendering = false;
        setStoryboard(updated); addLog(`Visual Selesai (-${COST_VIDEO_SCENE} CR)`, "success");
      }
    } catch (e: any) { 
      addLog("Render Gagal.", "error"); 
      const reset = [...storyboard]; reset[index].isRendering = false; setStoryboard(reset);
    } finally {
      refreshCredits();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="fixed top-6 right-6 z-[400] w-72 lg:w-80 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {processLogs.map((log) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: 50 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, scale: 0.8 }}
              drag="x"
              dragConstraints={{ left: -300, right: 300 }}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 100) removeLog(log.id); }}
              className={`pointer-events-auto cursor-grab active:cursor-grabbing p-4 rounded-2xl glass-panel border-l-4 backdrop-blur-3xl shadow-2xl flex flex-col gap-1 ${log.type === 'success' ? 'border-l-cyan-500 bg-cyan-500/10' : log.type === 'error' ? 'border-l-red-500 bg-red-500/20' : 'border-l-white/20 bg-white/5'}`}
            >
              <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-500">
                <span>{log.time}</span>
                <span className="opacity-30">← Swipe Kiri/Kanan →</span>
              </div>
              <p className="text-[10px] font-bold text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/5 border-white/5 text-yellow-500'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase">{t.studioPro} <span className="text-yellow-500">Pro</span></h2>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo Anda</p>
           <p className="text-xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'input' ? (
          <motion.div key="input" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-panel p-5 rounded-[2.5rem] bg-slate-900/40 border-white/5 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
                 <div className="flex items-center gap-8">
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black uppercase text-slate-600 px-1 tracking-widest">Visual Pipeline (Start & End)</label>
                       <div className="flex items-center gap-2">
                          <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                            {refImages.map((img, i) => (
                              <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black relative group shadow-lg">
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={() => setRefImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 text-white text-[8px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">DEL</button>
                              </div>
                            ))}
                            {refImages.length < 2 && (
                              <label className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-yellow-500/50 hover:bg-white/5 transition-all">
                                <i className="fa-solid fa-plus text-[10px] text-slate-700"></i>
                                <input type="file" onChange={handleRefImage} className="hidden" accept="image/*" />
                              </label>
                            )}
                          </div>
                          <i className="fa-solid fa-arrow-right text-[10px] text-slate-800"></i>
                          <div className="w-14 h-14 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group bg-black/40">
                             {globalEndFrame ? (
                               <>
                                 <img src={globalEndFrame} className="w-full h-full object-cover" />
                                 <button onClick={() => setGlobalEndFrame(null)} className="absolute inset-0 bg-black/60 text-white text-[8px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">RESET</button>
                               </>
                             ) : (
                               <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5">
                                 <i className="fa-solid fa-flag-checkered text-[10px] text-slate-700"></i>
                                 <input type="file" onChange={e => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     const reader = new FileReader();
                                     reader.onloadend = () => setGlobalEndFrame(reader.result as string);
                                     reader.readAsDataURL(file);
                                   }
                                 }} className="hidden" accept="image/*" />
                               </label>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-6">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-600 px-1 tracking-widest">Tipe Proyek</label>
                      <div className="flex bg-black/60 p-1 rounded-xl border border-white/10">
                        {['Iklan', 'General'].map(t => (
                          <button key={t} onClick={() => setProjectType(t as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${projectType === t ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-600'}`}>{t === 'Iklan' ? 'IKLAN PRO' : 'CERITA'}</button>
                        ))}
                      </div>
                    </div>
                 </div>
            </div>

            <div className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-8 border-white/5 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-[0.2em]">Model Pria</label>
                  <select value={maleModel} onChange={e => setMaleModel(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-5 text-xs text-white outline-none focus:border-yellow-500/50 appearance-none shadow-inner">
                    {voiceOptions.male.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-[0.2em]">Model Wanita</label>
                  <select value={femaleModel} onChange={e => setFemaleModel(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-5 text-xs text-white outline-none focus:border-yellow-500/50 appearance-none shadow-inner">
                    {voiceOptions.female.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-[0.2em]">Visual Preset</label>
                  <select value={videoStyle} onChange={e => setVideoStyle(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-5 text-xs text-white outline-none focus:border-yellow-500/50 appearance-none shadow-inner">
                    {stylePresets.map(s => <option key={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 px-1 tracking-[0.2em]">Konsep Iklan / Deskripsi Produk</label>
                <textarea 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Contoh: Iklan serum pencerah wajah untuk target wanita karir..." 
                  className="w-full h-40 bg-black/60 border border-white/10 rounded-[2.5rem] p-8 text-sm text-white focus:border-yellow-500/50 outline-none resize-none shadow-inner leading-relaxed" 
                />
              </div>

              {/* Total Credit Deduct UI Pre-Production */}
              <div className="p-5 rounded-[2rem] bg-yellow-500/5 border border-yellow-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">{t.setupEst}</p>
                  <p className="text-xl font-black italic text-white leading-none">± {estimatedTotalCost} <span className="text-[10px] text-slate-500">CR</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sisa Saldo</p>
                  <p className={`text-[11px] font-black ${credits < estimatedTotalCost ? 'text-red-500' : 'text-slate-400'}`}>
                    {(credits).toLocaleString()} CR
                  </p>
                </div>
              </div>

              <button onClick={constructProject} disabled={isProcessing || !title || credits < estimatedTotalCost} className="w-full py-6 bg-yellow-500 text-black font-black uppercase rounded-[2rem] hover:bg-white transition-all shadow-2xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4">
                {isProcessing ? <><i className="fa-solid fa-spinner fa-spin"></i> GENERATING...</> : credits < estimatedTotalCost ? t.noCredit : <><i className="fa-solid fa-wand-magic-sparkles"></i> MULAI PRODUKSI</>}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className="flex justify-between items-center bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-black">
                    <i className="fa-solid fa-film text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-white tracking-widest truncate max-w-md">{title}</h3>
                    <p className="text-[9px] font-black uppercase text-slate-600 mt-1 tracking-[0.3em]">{projectType} MODE • {totalDuration}S</p>
                  </div>
                </div>
                <div className="text-right glass-panel px-6 py-3 rounded-2xl border-white/5">
                  <p className="text-[8px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">{t.totalProjectEst}</p>
                  <p className="text-xl font-black italic text-white leading-none">{actualTotalCost} <span className="text-[10px] text-slate-500">CR</span></p>
                  <p className="text-[8px] font-black text-slate-600 uppercase mt-1">Sisa Saldo: {(credits).toLocaleString()} CR</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {storyboard.map((s, i) => (
                  <div key={i} className="glass-panel p-6 rounded-[3rem] bg-black/40 border-white/5 space-y-5 shadow-2xl relative group">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <span className="w-9 h-9 rounded-full bg-yellow-500 text-black flex items-center justify-center text-[11px] font-black shadow-lg">{i+1}</span>
                           <span className="text-[11px] font-black text-white uppercase tracking-tighter">{s.scene}</span>
                        </div>
                        <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase border ${s.speaker === 'Laki-laki' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'}`}>
                          {s.speaker}
                        </span>
                     </div>
                     <div className="bg-black/60 p-5 rounded-[1.8rem] border border-white/5 space-y-4 shadow-inner">
                        <p className="text-[11px] text-white font-bold leading-relaxed">{s.audio}</p>
                        <div className="flex items-center gap-3">
                           <button onClick={() => generateAudio(i)} disabled={s.isAudioLoading} className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase transition-all shadow-md ${s.audioUrl ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                              <i className="fa-solid fa-microphone-lines mr-2"></i> {s.audioUrl ? 'Audio Synced' : 'Generate Audio'}
                           </button>
                           {s.audioUrl && <audio src={s.audioUrl} controls className="h-6 w-24 opacity-30 hover:opacity-100 transition-all" />}
                        </div>
                     </div>
                     <div className="aspect-video rounded-[2rem] bg-black relative overflow-hidden border border-white/5 shadow-2xl">
                        {s.videoUrl ? <video src={s.videoUrl} autoPlay loop muted className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center opacity-10"><i className="fa-solid fa-microchip text-4xl"></i></div>}
                        {s.isRendering && <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm"><i className="fa-solid fa-spinner fa-spin text-yellow-500 text-2xl mb-3"></i><p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest animate-pulse">Rendering Engine...</p></div>}
                     </div>

                     <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center px-2">
                           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Biaya Render Adegan</p>
                           <p className="text-[10px] font-black text-white">{COST_VIDEO_SCENE} CR</p>
                        </div>
                        <button 
                         onClick={() => renderVideo(i)} 
                         disabled={s.isRendering || credits < COST_VIDEO_SCENE} 
                         className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95 ${credits < COST_VIDEO_SCENE && !s.videoUrl ? 'bg-red-500/10 text-red-500 opacity-50' : 'bg-white text-black hover:bg-yellow-500'}`}
                        >
                           {s.videoUrl ? 'Render Ulang' : s.isRendering ? 'Processing...' : credits < COST_VIDEO_SCENE ? t.noCredit : `Render Visual`}
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
