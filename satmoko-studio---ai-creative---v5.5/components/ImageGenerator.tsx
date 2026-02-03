
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageGeneratorProps {
  onBack: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('Realistic');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

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
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() && !sourceImage) return;

    const apiKey = getAvailableApiKey();
    if (!apiKey) {
      alert("Master, API Key belum terdeteksi. Pastikan variabel VITE_GEMINI_API_KEY_1 sudah diset di Render.");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelName = 'gemini-2.5-flash-image';
      
      const fullPrompt = `${prompt} [Style: ${stylePreset}]`.trim();
      let parts: any[] = [];
      
      if (sourceImage) {
        parts.push({ inlineData: { data: sourceImage.split(',')[1], mimeType: 'image/png' } });
        parts.push({ text: fullPrompt || "enhance and refine this image" });
      } else {
        parts.push({ text: fullPrompt });
      }

      const response = await ai.models.generateContent({ 
        model: modelName, 
        contents: { parts }, 
        config: { 
          imageConfig: { 
            aspectRatio: aspectRatio as any
          } 
        } 
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }
      
      if (!foundImage) throw new Error("Model tidak mengembalikan data visual.");
    } catch (e: any) {
      console.error("Synthesis Error:", e);
      alert("System Feedback: Gagal melakukan sintesis visual. " + (e.message || ""));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-lg"
        >
          <i className="fa-solid fa-chevron-left text-xs group-hover:-translate-x-1 transition-transform text-slate-400"></i>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white">Back</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5 space-y-6">
          <section className="glass-panel p-8 rounded-[2rem] space-y-6 bg-slate-900/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
              <i className="fa-solid fa-palette text-[12rem]"></i>
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">Image Generator</h3>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest leading-relaxed">Synthesis & Morphing (Flash Engine)</p>
            </div>
            <div className="space-y-5 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                  <span>Reference Anchor</span>
                  {sourceImage && <button onClick={() => setSourceImage(null)} className="text-red-400 hover:text-red-300 transition-colors">Clear</button>}
                </label>
                <div className="relative">
                  {sourceImage ? (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                      <img src={sourceImage} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <label className="w-full h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all shadow-inner">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      <i className="fa-solid fa-cloud-arrow-up mb-2 text-slate-500"></i>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Drop Reference</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creation Prompt</label>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  className="w-full h-24 glass-input rounded-xl p-4 text-xs focus:outline-none resize-none bg-black/40 border-white/5 text-white" 
                  placeholder="Deskripsikan artefak yang ingin Master sintesis..."
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Style Engine</label>
                  <select value={stylePreset} onChange={e => setStylePreset(e.target.value)} className="w-full glass-input rounded-xl p-3.5 text-xs text-slate-300 bg-black/40 border-white/5">
                    <option>Realistic</option><option>Cinematic</option><option>Digital Art</option><option>Cyberpunk</option><option>Architectural</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Output Ratio</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full glass-input rounded-xl p-3.5 text-xs text-slate-300 bg-black/40 border-white/5">
                    <option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  onClick={generateImage} 
                  disabled={isGenerating || (!prompt.trim() && !sourceImage)} 
                  className="flex-1 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-cyan-400 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Synthesize Artifact"}
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="xl:col-span-7">
          <div className="glass-panel h-full min-h-[500px] rounded-[2rem] overflow-hidden flex flex-col items-center justify-center bg-slate-950/40 p-12 shadow-2xl">
            <AnimatePresence mode="wait">
              {resultImage ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center gap-8"
                >
                  <img src={resultImage} className="w-full max-h-[70vh] rounded-3xl object-contain shadow-2xl" alt="Result" />
                  <div className="flex gap-4">
                    <a href={resultImage} download={`Satmoko_${Date.now()}.png`} className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-cyan-400 transition-all shadow-xl">Download</a>
                    <button onClick={() => setResultImage(null)} className="px-10 py-4 bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all">Reset</button>
                  </div>
                </motion.div>
              ) : isGenerating ? (
                <div className="text-center">
                  <div className="w-20 h-20 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 animate-pulse">Synthesizing Pixels...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20 shadow-inner">
                    <i className="fa-solid fa-palette text-2xl"></i>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-20">Canvas Waiting for Pulse</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
