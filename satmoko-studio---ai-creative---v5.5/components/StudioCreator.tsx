
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';

interface StudioCreatorProps {
  onBack: () => void;
}

export const StudioCreator: React.FC<StudioCreatorProps> = ({ onBack }) => {
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'story' | 'final'>('input');
  const [storyboard, setStoryboard] = useState<{scene: string, visual: string}[]>([]);

  const getAvailableApiKey = () => {
    const getEnv = (key: string) => {
      const vEnv = (import.meta as any).env || {};
      const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
      const wEnv = (window as any).process?.env || {};
      return vEnv[key] || pEnv[key] || wEnv[key] || "";
    };

    return getEnv('VITE_GEMINI_API_KEY_1') || 
           getEnv('VITE_GEMINI_API_KEY_2') || 
           getEnv('VITE_GEMINI_API_KEY_3') || 
           getEnv('VITE_API_KEY') || 
           getEnv('API_KEY');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 3);
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
  };

  const runStudioCreator = async () => {
    if (!title.trim()) return;
    
    const apiKey = getAvailableApiKey();
    if (!apiKey) {
      alert("Master, API Key belum terdeteksi untuk modul ini. Cek Environment Audit di Sidebar.");
      return;
    }

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = images.map(img => ({
        inlineData: {
          data: img.split(',')[1],
          mimeType: 'image/png'
        }
      }));

      parts.push({
        text: `Bikin alur cerita animasi pendek berdasarkan judul: "${title}". Berikan output dalam format JSON array yang berisi 3 scene. Setiap scene punya properti "scene" (dialog/aksi dalam bahasa Indonesia) dan "visual" (deskripsi visual teknis detil dalam bahasa Inggris).`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene: { type: Type.STRING },
                visual: { type: Type.STRING }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      setStoryboard(data);
      setStep('story');
    } catch (e: any) {
      console.error("Studio Error:", e);
      alert("System Feedback: " + (e.message || "Hambatan teknis pada Studio Engine."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col py-2">
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-lg"
        >
          <i className="fa-solid fa-chevron-left text-xs group-hover:-translate-x-1 transition-transform text-slate-400"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white">Back</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div 
            key="input-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="text-center space-y-8 w-full max-w-xl mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-fuchsia-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-pulse">
              <i className="fa-solid fa-wand-magic-sparkles text-4xl text-white"></i>
            </div>
            <div>
              <h2 className="text-4xl font-display font-black tracking-tighter mb-2 uppercase italic text-gradient">Studio creator <span className="text-cyan-500">animasi</span></h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Workflow Orchestrator v1.2</p>
            </div>
            
            <div className="glass-panel p-10 rounded-[3rem] w-full space-y-8 bg-slate-900/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full"></div>
              
              <div className="space-y-3 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 flex items-center gap-2">
                  <i className="fa-solid fa-pen-nib text-cyan-500"></i>
                  Project Identity
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nama proyek Master..."
                  className="w-full glass-input rounded-2xl py-5 px-6 text-lg font-bold focus:outline-none placeholder:text-slate-800 bg-black/40 text-white"
                />
              </div>

              <div className="space-y-4 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Visual Anchors (Max 3)</label>
                <div className="grid grid-cols-3 gap-4">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-square bg-black/60 rounded-2xl overflow-hidden border border-white/5 group relative shadow-lg">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 backdrop-blur-md rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <label className="aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all text-slate-600 hover:text-cyan-400 group">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      <i className="fa-solid fa-plus text-xl mb-1 group-hover:scale-110 transition-transform"></i>
                      <span className="text-[8px] font-black uppercase tracking-widest">Inject</span>
                    </label>
                  )}
                </div>
              </div>

              <button 
                onClick={runStudioCreator}
                disabled={isProcessing || !title}
                className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-3">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Optimizing...</span>
                  </div>
                ) : "Execute Workflow"}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'story' && (
          <motion.div 
            key="story-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full space-y-8"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div>
                <h3 className="text-3xl font-display font-black tracking-tighter uppercase italic">
                  Results: <span className="text-cyan-500">"{title}"</span>
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black mt-2">Intelligence Synthesis Generated</p>
              </div>
              <button 
                onClick={() => setStep('input')} 
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-slate-300"
              >
                Reset Core
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {storyboard.map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  key={i} 
                  className="glass-panel p-8 rounded-[3rem] border border-white/5 space-y-6 relative group hover:border-cyan-500/30 transition-all bg-slate-900/60 shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500 flex items-center justify-center text-black font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    SCENE 0{i+1}
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2">
                       <i className="fa-solid fa-microphone-lines text-cyan-500/50"></i>
                       Narrative
                    </p>
                    <p className="text-sm leading-relaxed text-slate-200 font-medium">{item.scene}</p>
                  </div>
                  <div className="space-y-3 pt-6 border-t border-white/5">
                    <p className="text-[9px] font-black uppercase text-cyan-400 tracking-[0.3em] flex items-center gap-2">
                       <i className="fa-solid fa-camera-movie text-cyan-400"></i>
                       Visual Prompt
                    </p>
                    <div className="p-5 bg-black/60 rounded-2xl border border-white/5">
                       <p className="text-[10px] text-slate-400 leading-relaxed italic font-mono group-hover:text-slate-200 transition-colors">
                         {item.visual}
                       </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
