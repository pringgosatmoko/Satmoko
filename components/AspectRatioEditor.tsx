
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey, isAdmin as checkAdmin, getActiveApiKey } from '../lib/api';

interface AspectRatioEditorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

const RATIOS = [
  { id: '16:9', label: 'Cinematic', icon: 'fa-film' },
  { id: '9:16', label: 'Story/TikTok', icon: 'fa-mobile-screen' },
  { id: '1:1', label: 'Instagram', icon: 'fa-square' },
  { id: '4:3', label: 'Standard', icon: 'fa-tv' },
  { id: '3:4', label: 'Portrait', icon: 'fa-rectangle-portrait' }
];

export const AspectRatioEditor: React.FC<AspectRatioEditorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [costPerProcess, setCostPerProcess] = useState(25);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => {
    getSystemSettings().then(s => setCostPerProcess(s.cost_image || 25));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setResultImage(null);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processReframe = async (retryCount = 0) => {
    if (!sourceImage) {
      setErrorMsg("UNGGAH GAMBAR SUMBER TERLEBIH DAHULU!");
      return;
    }
    
    if (!isAdmin && credits < costPerProcess) {
      setErrorMsg("SALDO TIDAK CUKUP!");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    console.log(`[NeuralHub] Memulai proses Smart Outpaint ke rasio ${aspectRatio}`);

    try {
      if (retryCount === 0 && !isAdmin) {
        const success = await deductCredits(userEmail, costPerProcess);
        if (!success) throw new Error("Gagal memotong kredit.");
        refreshCredits();
      }

      // Initialization: Use getActiveApiKey() for reliable retrieval.
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      
      const promptText = `This is a Smart Outpainting task. Extend the background of the provided image to fill a ${aspectRatio} aspect ratio perfectly. 
      Analyze the textures, lighting, and composition of the original image and generate new matching content for the empty areas. 
      Maintain high quality and professional seamless blending.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { 
          parts: [
            { inlineData: { data: sourceImage.split(',')[1], mimeType: 'image/png' } }, 
            { text: promptText } 
          ] 
        },
        config: { 
          imageConfig: { 
            aspectRatio: aspectRatio as any
          } 
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
        setResultImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        console.log("[NeuralHub] Reframe berhasil!");
      } else {
        throw new Error("Mesin gagal mengonstruksi latar belakang baru.");
      }
    } catch (e: any) {
      console.error("[NeuralHub] Error:", e);
      if ((e.message?.includes('429') || e.message?.includes('quota')) && retryCount < 2) {
        rotateApiKey();
        return processReframe(retryCount + 1);
      }
      setErrorMsg(e.message?.toUpperCase() || "KEGAGALAN NEURAL ENGINE.");
    } finally {
      setIsProcessing(false);
      refreshCredits();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white overflow-hidden">
      <header className="px-6 pt-6 flex flex-col items-center flex-shrink-0">
        <div className="w-full flex justify-between items-center mb-8">
          <button onClick={onBack} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center active:scale-90 transition-transform">
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <h2 className="text-sm font-black uppercase italic tracking-widest">Smart <span className="text-emerald-500">Outpaint</span></h2>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar flex flex-col items-center gap-8">
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 text-center">
              ERROR: {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-2xl flex flex-col gap-6">
           {/* Image Display Area */}
           <div className="relative aspect-video lg:aspect-[21/9] bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group">
              <AnimatePresence mode="wait">
                {resultImage ? (
                  <motion.img key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={resultImage} className="w-full h-full object-contain" />
                ) : sourceImage ? (
                  <motion.img key="source" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={sourceImage} className="w-full h-full object-contain opacity-40 blur-sm" />
                ) : (
                  <div key="placeholder" className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                    <i className="fa-solid fa-image text-6xl mb-4"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Belum Ada Input</p>
                  </div>
                )}
              </AnimatePresence>
              
              {/* Overlay for Source when blurred */}
              {!resultImage && sourceImage && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                   <img src={sourceImage} className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10" />
                </div>
              )}

              {/* Action Floating Buttons */}
              {resultImage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                   <button onClick={() => setResultImage(null)} className="px-6 py-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all">Re-Edit</button>
                   <a href={resultImage} download="satmoko_outpaint.png" className="px-6 py-3 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-lg">Download</a>
                </div>
              )}
           </div>

           {/* Ratio Selector */}
           <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] px-2">Pilih Target Rasio</p>
              <div className="grid grid-cols-5 gap-2">
                 {RATIOS.map(r => (
                   <button 
                    key={r.id} 
                    onClick={() => { setAspectRatio(r.id); setResultImage(null); }} 
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${aspectRatio === r.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 text-slate-600 hover:text-white'}`}
                   >
                      <i className={`fa-solid ${r.icon} text-lg`}></i>
                      <span className="text-[7px] font-black uppercase">{r.id}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      </main>

      <footer className="px-6 pb-12 flex-shrink-0">
        <div className="bg-[#121212] rounded-[2.5rem] p-2.5 flex items-center gap-2 border border-white/5 shadow-2xl max-w-3xl mx-auto w-full">
          <label className="w-12 h-12 rounded-full bg-[#1c1c1c] flex items-center justify-center text-slate-400 cursor-pointer active:scale-90 transition-transform">
             <i className="fa-solid fa-plus"></i>
             <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
          </label>
          <div className="flex-1 px-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
               {sourceImage ? "Gambar Terpilih • Siap Outpaint" : "Pilih Gambar Sumber..."}
             </p>
          </div>
          <button 
            onClick={() => processReframe()} 
            disabled={isProcessing || !sourceImage} 
            className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-full flex items-center gap-4 shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
          >
            <span className="text-xs font-black uppercase italic text-white">{isProcessing ? 'RENDERING' : 'REFRAME'}</span>
            {!isProcessing && <span className="text-[11px] font-black text-white/60">{isAdmin ? '0' : costPerProcess}</span>}
          </button>
        </div>
      </footer>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[600] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-10">
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full" />
             <motion.div animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border-2 border-white/5 border-b-white/20 rounded-full" />
          </div>
          <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.6em] animate-pulse text-center px-10">
            Neural Reframe Active...<br/>
            <span className="text-[8px] text-white opacity-40 mt-2 block italic">MENGONSTRUKSI REALITAS VISUAL BARU</span>
          </p>
        </div>
      )}
    </div>
  );
};
