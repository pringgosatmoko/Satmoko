
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits } from '../lib/api';

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

interface SceneResult {
  text: string;
  videoUrl: string | null;
  isRendering: boolean;
}

interface VoiceCloningProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const VoiceCloning: React.FC<VoiceCloningProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [refImage, setRefImage] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [clonedAudioUrl, setClonedAudioUrl] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  
  const COST_VOICE = 150;
  const COST_VIDEO = 150;

  const voices = [
    { name: 'Zephyr', desc: 'Sangat Berwibawa & Profesional' },
    { name: 'Puck', desc: 'Ceria & Energik' },
    { name: 'Kore', desc: 'Lembut & Menenangkan' },
    { name: 'Fenrir', desc: 'Berat & Misterius' }
  ];

  const t = {
    id: {
      guide: "Modul ini menggabungkan TTS dengan Auto-Scene Splitting. Biaya: 150 CR per sintesis/video.",
      title: "PANDUAN SUARA",
      neuralVoice: "Neural Voice",
      noCredit: "KREDIT HABIS!"
    },
    en: {
      guide: "Advanced TTS with Intelligent Scene Splitting. Cost: 150 CR per synthesis/video.",
      title: "VOCAL DOCUMENTATION",
      neuralVoice: "Neural Voice",
      noCredit: "CREDIT EXHAUSTED!"
    }
  }[lang];

  const ratios = [
    { label: '16:9', val: '16:9', icon: 'fa-tv' },
    { label: '9:16', val: '9:16', icon: 'fa-mobile-screen' },
    { label: '1:1', val: '1:1', icon: 'fa-square' },
    { label: '4:3', val: '4:3', icon: 'fa-photo-film' }
  ];

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setProcessLogs(prev => [...prev, { id, msg, type, time }]);
  };

  const removeLog = (id: string) => {
    setProcessLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
        addLog("Visual Identity Terkunci.", "success");
      };
      reader.readAsDataURL(file);
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

  const generateVoice = async () => {
    if (credits < COST_VOICE) return addLog(t.noCredit, "error");
    setIsProcessing(true);
    setClonedAudioUrl(null);
    setScenes([]);
    addLog(`Sintesis Suara Profil ${selectedVoice}...`);

    try {
      const success = await deductCredits(userEmail, COST_VOICE);
      if (!success) {
        addLog("Gagal memproses kredit.", "error");
        setIsProcessing(false);
        return;
      }
      refreshCredits();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          }
        }
      });

      const base64Output = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Output) {
        const audioUrl = await decodeBase64Audio(base64Output);
        setClonedAudioUrl(audioUrl);
        addLog(`Suara Berhasil Dibuat (-${COST_VOICE} CR)`, "success");
        const splitText = script.split(/[.!?\n]+/).filter(t => t.trim().length > 3);
        setScenes(splitText.map(t => ({ text: t.trim(), videoUrl: null, isRendering: false })));
      }
    } catch (e: any) {
      addLog(`ERR: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
      refreshCredits();
    }
  };

  const renderScene = async (index: number) => {
    if (credits < COST_VIDEO) return addLog(t.noCredit, "error");
    const scene = scenes[index];
    if (!visualPrompt || scene.videoUrl) return;
    
    const updatedScenes = [...scenes];
    updatedScenes[index].isRendering = true;
    setScenes(updatedScenes);
    addLog(`Rendering Adegan ${index + 1}...`, "info");
    
    try {
      const success = await deductCredits(userEmail, COST_VIDEO);
      if (!success) {
        addLog("Kredit tidak cukup.", "error");
        const reset = [...scenes]; reset[index].isRendering = false; setScenes(reset);
        return;
      }
      refreshCredits();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const scenePrompt = `${visualPrompt}, adegan: ${scene.text}, cinematic style, ultra high quality.`;
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: scenePrompt,
        image: refImage ? { imageBytes: refImage.split(',')[1], mimeType: refImage.match(/data:([^;]+);/)?.[1] || 'image/png' } : undefined,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio as any }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const resp = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const blob = await resp.blob();
        const finalScenes = [...scenes];
        finalScenes[index].videoUrl = URL.createObjectURL(blob as Blob);
        finalScenes[index].isRendering = false;
        setScenes(finalScenes);
        addLog(`Adegan ${index + 1} Selesai (-${COST_VIDEO} CR)`, "success");
      }
    } catch (e: any) {
      const resetScenes = [...scenes]; resetScenes[index].isRendering = false; setScenes(resetScenes);
      addLog(`Gagal Render.`, "error");
    } finally {
      refreshCredits();
    }
  };

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="fixed top-6 right-6 z-[300] w-72 lg:w-80 flex flex-col gap-2 pointer-events-none">
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
              className={`pointer-events-auto cursor-grab active:cursor-grabbing p-4 rounded-2xl glass-panel border-l-4 backdrop-blur-3xl shadow-2xl flex flex-col gap-1 ${log.type === 'error' ? 'border-l-red-500 bg-red-500/20' : log.type === 'success' ? 'border-l-green-500 bg-green-500/10' : 'border-l-cyan-500 bg-cyan-500/10'}`}
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
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl"><i className="fa-solid fa-arrow-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{t.neuralVoice} <span className="text-cyan-400">Voice</span></h2>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo Anda</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-6 shadow-2xl border-white/5">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Pilih Karakter & Rasio</label>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-[11px] text-white font-black uppercase outline-none focus:border-cyan-500/50">
                      {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    {ratios.map(r => (
                      <button key={r.val} onClick={() => setAspectRatio(r.val)} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${aspectRatio === r.val ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-600 hover:text-white'}`}>
                        <i className={`fa-solid ${r.icon}`}></i>
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Naskah Master (Split Otomatis)</label>
              <textarea 
                value={script} 
                onChange={e => setScript(e.target.value)} 
                placeholder="Tulis naskah. AI akan memecahnya menjadi adegan..." 
                className="w-full h-48 bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white focus:border-cyan-500/50 outline-none resize-none shadow-inner"
              />
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
              <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Biaya Sintesis Suara</p>
              <p className="text-lg font-black italic text-white">{COST_VOICE} <span className="text-[10px] text-slate-500">CR</span></p>
            </div>

            <button 
              onClick={generateVoice} 
              disabled={isProcessing || !script || credits < COST_VOICE} 
              className="w-full py-5 bg-cyan-600 text-white font-black uppercase rounded-2xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-20"
            >
              {isProcessing ? "PROCESSING..." : credits < COST_VOICE ? t.noCredit : "SINTESIS SUARA & SCENES"}
            </button>
          </section>

          <section className="glass-panel p-8 rounded-[3rem] bg-slate-900/40 space-y-4 shadow-2xl border-white/5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1 flex items-center gap-2">
              <i className="fa-solid fa-camera text-cyan-500"></i> Visual Identity
            </label>
            <div className="grid grid-cols-2 gap-4">
               <div className="aspect-square rounded-[2rem] bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden group">
                 {refImage ? (
                   <>
                     <img src={refImage} className="w-full h-full object-cover" />
                     <button onClick={() => setRefImage(null)} className="absolute top-2 right-2 w-7 h-7 bg-black/80 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-xmark"></i></button>
                   </>
                 ) : (
                   <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                     <i className="fa-solid fa-image text-slate-800 text-2xl"></i>
                     <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                   </label>
                 )}
               </div>
               <div className="flex flex-col gap-2">
                 <input 
                  type="text" 
                  value={visualPrompt} 
                  onChange={e => setVisualPrompt(e.target.value)} 
                  placeholder="Gaya Visual..." 
                  className="bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-white outline-none flex-1 placeholder:text-slate-800"
                 />
                 <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-center">
                    <p className="text-[7px] font-black text-slate-600 uppercase">Per Render</p>
                    <p className="text-[10px] font-black text-cyan-500">150 CR</p>
                 </div>
               </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-7 space-y-6">
           <div className="glass-panel min-h-[600px] rounded-[4rem] flex flex-col p-8 bg-black/30 border-white/5 shadow-2xl overflow-hidden relative border-t-white/10">
              <AnimatePresence mode="wait">
                {scenes.length > 0 ? (
                  <motion.div key="scenes-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.3em]">Story Board: {scenes.length} Scenes</h4>
                      {clonedAudioUrl && <audio src={clonedAudioUrl} controls className="h-8 opacity-40 w-48" />}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[650px] pr-2 custom-scrollbar">
                      {scenes.map((s, idx) => (
                        <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-4 flex flex-col gap-3 group shadow-lg">
                           <div className="aspect-video rounded-2xl bg-black relative overflow-hidden flex items-center justify-center">
                              {s.videoUrl ? (
                                <video src={s.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center">
                                  {s.isRendering ? (
                                    <i className="fa-solid fa-spinner fa-spin text-cyan-500 text-xl"></i>
                                  ) : (
                                    <i className="fa-solid fa-clapperboard text-slate-800 text-xl"></i>
                                  )}
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-lg text-[8px] font-black text-white">SCENE {idx+1}</div>
                           </div>
                           <p className="text-[10px] text-slate-400 italic line-clamp-2 px-2">"{s.text}"</p>
                           <button 
                            onClick={() => renderScene(idx)} 
                            disabled={s.isRendering || !!s.videoUrl || credits < COST_VIDEO} 
                            className={`w-full py-2 rounded-xl text-[8px] font-black uppercase transition-all shadow-md ${s.videoUrl ? 'bg-green-500/10 text-green-500 border border-green-500/20' : (credits < COST_VIDEO ? 'bg-red-500/10 text-red-500 opacity-50' : 'bg-white/5 text-slate-500 hover:bg-cyan-500 hover:text-black')}`}
                           >
                             {s.videoUrl ? 'Rendered' : s.isRendering ? 'Rendering...' : credits < COST_VIDEO ? 'Kredit Habis' : 'Render (150 CR)'}
                           </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10 gap-8">
                    <i className="fa-solid fa-diagram-project text-9xl animate-pulse"></i>
                    <p className="font-black uppercase tracking-[1.5em] text-2xl">Neural Pipeline Ready</p>
                  </div>
                )}
              </AnimatePresence>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center z-[100]">
                  <div className="w-28 h-28 rounded-full border-4 border-white/5 border-t-cyan-500 animate-spin shadow-[0_0_20px_rgba(34,211,238,0.3)]"></div>
                  <p className="mt-10 text-cyan-400 font-black uppercase tracking-[0.6em] text-[11px] animate-pulse">Synchronizing Neural Waves...</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
