
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoGeneratorProps {
  mode: 'img2vid' | 'text2vid';
  onBack: () => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ mode, onBack }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');

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

  const generateVideo = async () => {
    if (mode === 'img2vid' && !sourceImage) return;
    if (mode === 'text2vid' && !prompt) return;

    const apiKey = getAvailableApiKey();

    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      try {
        await window.aistudio.openSelectKey();
      } catch (e) {
        console.warn("Key Selection Dialog skipped");
      }
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Menghubungkan ke Veo Engine...');

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
      const config = {
        numberOfVideos: 1,
        resolution: '720p' as const,
        aspectRatio: '16:9' as const,
      };

      let operation;
      if (mode === 'img2vid' && sourceImage) {
        setStatus('Mengunggah referensi visual...');
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt || 'Animate this image beautifully',
          image: {
            imageBytes: sourceImage.split(',')[1],
            mimeType: 'image/png',
          },
          config,
        });
      } else {
        setStatus('Mengunggah referensi visual...');
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config,
        });
      }

      setStatus('Veo sedang merender video (30-60 detik)...');
      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${apiKey || process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      } else {
        throw new Error('Gagal mendapatkan tautan video.');
      }
    } catch (e: any) {
      console.error("Veo Error:", e);
      if (e.message?.includes("Requested entity was not found") && window.aistudio) {
        await window.aistudio.openSelectKey();
      }
      alert('Veo Feedback: ' + (e.message || "Unknown error in video engine."));
    } finally {
      setIsGenerating(false);
      setStatus('');
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
          <section className="glass-panel p-8 rounded-[2rem] space-y-6 bg-slate-900/40">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">
                Video Image Generator
              </h3>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                Cinematic Generation (Veo Preview)
              </p>
            </div>

            <div className="space-y-5">
              {mode === 'img2vid' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source Image</label>
                  <div className="relative">
                    {sourceImage ? (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 relative group">
                        <img src={sourceImage} className="w-full h-full object-cover" />
                        <button onClick={() => setSourceImage(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fa-solid fa-trash text-red-400"></i>
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-40 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors shadow-inner">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <i className="fa-solid fa-image text-2xl mb-2 text-slate-600"></i>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Upload Reference</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prompt Instruksi</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-24 glass-input rounded-xl p-4 text-xs focus:outline-none resize-none bg-black/40 border-white/5"
                  placeholder="Deskripsikan gerakan atau suasana video..."
                ></textarea>
              </div>

              <button 
                onClick={generateVideo}
                disabled={isGenerating || (mode === 'img2vid' && !sourceImage) || (mode === 'text2vid' && !prompt)}
                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-cyan-400 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-3">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Processing...</span>
                  </div>
                ) : "Start Rendering"}
              </button>
            </div>
          </section>
        </div>

        <div className="xl:col-span-7">
          <div className="glass-panel h-full min-h-[500px] rounded-[2rem] overflow-hidden flex flex-col items-center justify-center bg-slate-955/40 p-6 shadow-2xl">
            <AnimatePresence mode="wait">
              {videoUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center gap-6"
                >
                  <video src={videoUrl} controls className="w-full max-h-[70vh] rounded-3xl shadow-2xl" autoPlay loop />
                  <a href={videoUrl} download="Satmoko_Video.mp4" className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-cyan-400 transition-all shadow-xl">
                    Download Video
                  </a>
                </motion.div>
              ) : isGenerating ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 animate-pulse">{status}</p>
                </div>
              ) : (
                <div className="text-center opacity-20">
                  <i className="fa-solid fa-clapperboard text-6xl mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">Video Output Ready</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
