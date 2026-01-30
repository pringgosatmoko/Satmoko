import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey, getActiveApiKey, isAdmin as checkAdmin } from '../lib/api';

interface ImageGeneratorProps { 
  onBack: () => void; 
  userEmail: string; 
  credits: number; 
  refreshCredits: () => void; 
}

const STYLES = [
  { id: 'cinematic', name: 'Realistic Cinematic', prompt: 'hyper-realistic cinematic, 8k, movie shot, dramatic lighting, detailed textures' },
  { id: 'pixar', name: 'Disney Pixar', prompt: 'disney pixar animation style, 3d render, cute character, vibrant colors, ray tracing, masterpiece' },
  { id: 'ghibli', name: 'Studio Ghibli', prompt: 'studio ghibli anime style, hand-drawn aesthetic, lush environments, nostalgic, high quality' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', prompt: 'cyberpunk aesthetic, neon lighting, futuristic city, high contrast, synthwave vibes' },
  { id: 'vintage', name: 'Vintage 35mm', prompt: '35mm film photography, grainy, nostalgic colors, vintage lens blur, analog aesthetic' },
  { id: 'oil', name: 'Oil Painting', prompt: 'masterpiece oil painting, textured brushstrokes, classical art style, rich colors' }
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack, userEmail, credits, refreshCredits }) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [activeStyleId, setActiveStyleId] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [modelType, setModelType] = useState<'Nano Banana' | 'Nano Banana Pro'>('Nano Banana');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [cost, setCost] = useState(25);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => { 
    getSystemSettings().then(s => setCost(s.cost_image || 25)); 
  }, []);

  const selectedStyle = STYLES.find(s => s.id === activeStyleId) || STYLES[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        if (referenceImages.length < 3) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReferenceImages(prev => [...prev, reader.result as string].slice(0, 3));
          };
          reader.readAsDataURL(file);
        }
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

  const generateImage = async (retryCount = 0) => {
    setErrorMsg(null);
    const cleanPrompt = prompt.trim();
    
    if (modelType === 'Nano Banana Pro' && window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowKeyPicker(true);
      return;
    }

    if (!cleanPrompt && referenceImages.length === 0) {
      setErrorMsg("MASUKKAN DESKRIPSI VISUAL ANDA!");
      return;
    }

    if (!isAdmin && credits < cost) {
      setErrorMsg(`SALDO TIDAK CUKUP! BUTUH ${cost} CR.`);
      return;
    }

    setIsGenerating(true);
    
    try {
      if (retryCount === 0 && !isAdmin) { 
        const success = await deductCredits(userEmail, cost); 
        if (!success) throw new Error("GAGAL MEMOTONG KREDIT. SILAKAN TOPUP.");
        refreshCredits(); 
      }
      
      const apiKey = getActiveApiKey();
      if (!apiKey) throw new Error("API KEY TIDAK TERKONFIGURASI DI NEURAL ENGINE.");

      const ai = new GoogleGenAI({ apiKey });
      const modelName = modelType === 'Nano Banana Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      
      const parts: any[] = referenceImages.map(img => ({
        inlineData: {
          data: img.split(',')[1],
          mimeType: 'image/png'
        }
      }));

      const finalPrompt = `${enhancePrompt ? 'Masterpiece, hyper-detailed, high quality: ' : ''}${cleanPrompt}. Style: ${selectedStyle.prompt}`;
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: { 
          imageConfig: { 
            aspectRatio: aspectRatio as any, 
            imageSize: modelName === 'gemini-3-pro-image-preview' ? '1K' : undefined 
          } 
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
        const imgData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        setResult(imgData);
        setHistory(prev => [imgData, ...prev].slice(0, 10));
      } else {
        throw new Error("MESIN TIDAK MENGEMBALIKAN DATA GAMBAR. COBA PROMPT LAIN.");
      }
    } catch (e: any) {
      console.error("[NeuralHub] Fatal Error:", e);
      const msg = String(e?.message || JSON.stringify(e) || "");
      
      if (msg.includes("Requested entity was not found.") && modelType === 'Nano Banana Pro') {
        setShowKeyPicker(true);
      } else if ((msg.includes('429') || msg.includes('quota') || msg.includes('API key')) && retryCount < 3) { 
        rotateApiKey(); 
        return generateImage(retryCount + 1); 
      }
      setErrorMsg(msg.toUpperCase() || "KEGAGALAN NEURAL ENGINE.");
    } finally { 
      setIsGenerating(false); 
      refreshCredits(); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white relative">
      <header className="px-6 pt-6 flex flex-col items-center flex-shrink-0">
        <div className="w-full flex justify-between items-center mb-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center">
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <div className="flex bg-[#121212] rounded-full p-1 border border-white/5">
            <button className="px-5 py-1.5 rounded-full bg-[#222222] text-xs font-bold"><i className="fa-solid fa-image"></i></button>
            <button onClick={onBack} className="px-5 py-1.5 rounded-full text-xs font-bold text-slate-500"><i className="fa-solid fa-video"></i></button>
          </div>
          <button onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center text-cyan-400">
            <i className="fa-solid fa-question text-sm"></i>
          </button>
        </div>
        <h1 className="text-3xl font-black mb-1 tracking-tight">AI Image Studio</h1>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Neural Engine v2.5</p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar flex flex-col items-center">
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 text-center"
            >
              ERROR: {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 w-full">
              <div className="relative group w-full">
                <img src={result} className="w-full rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center gap-4">
                  <button onClick={() => setResult(null)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl"><i className="fa-solid fa-rotate-left"></i></button>
                  <a href={result} download="satmoko_ai_art.png" className="w-12 h-12 bg-cyan-500 text-black rounded-full flex items-center justify-center shadow-xl"><i className="fa-solid fa-download"></i></a>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-full space-y-6">
              <div className="grid grid-cols-3 gap-3 h-44">
                {referenceImages.map((img, i) => (
                  <div key={i} className="rounded-[1.5rem] overflow-hidden relative border border-white/10 group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setReferenceImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
                {referenceImages.length < 3 && (
                  <label className="rounded-[1.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 bg-[#0a0a0a]">
                    <i className="fa-solid fa-plus text-slate-700 text-xl mb-1"></i>
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Add Ref</span>
                    <input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
              <div className="text-center opacity-10 flex flex-col items-center pt-16">
                <i className="fa-solid fa-bolt-lightning text-8xl mb-6 text-cyan-500"></i>
                <p className="text-[11px] font-black uppercase tracking-[0.8em]">Neural Engine Ready</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {history.length > 0 && !result && (
          <div className="w-full mt-10">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4 px-2">Recent Masterpieces</p>
            <div className="flex overflow-x-auto gap-4 no-scrollbar px-2 pb-4">
               {history.map((img, i) => (
                 <motion.button key={i} whileHover={{ scale: 1.05 }} onClick={() => setResult(img)} className="flex-shrink-0 w-32 aspect-square rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                    <img src={img} className="w-full h-full object-cover" />
                 </motion.button>
               ))}
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 pb-12 flex-shrink-0">
        <div className="bg-[#121212] rounded-[2.5rem] p-2.5 flex items-center gap-2 border border-white/5 shadow-2xl">
          <label className="w-12 h-12 rounded-full bg-[#1c1c1c] flex items-center justify-center text-slate-400 cursor-pointer active:scale-90 transition-transform"><i className="fa-solid fa-plus"></i><input type="file" multiple onChange={handleImageUpload} className="hidden" accept="image/*" /></label>
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-[#1c1c1c] flex items-center justify-center text-slate-400"><i className="fa-solid fa-sliders"></i></button>
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateImage()} placeholder="Ketik visi kreatif Anda..." className="flex-1 bg-transparent px-4 text-sm focus:outline-none text-white placeholder:text-slate-800 font-medium" />
          <button onClick={() => generateImage()} disabled={isGenerating} className="bg-[#d946ef] hover:bg-[#c026d3] px-6 py-4 rounded-full flex items-center gap-3 shadow-[0_0_25px_rgba(217,70,239,0.4)] transition-all active:scale-95">
            <span className="text-xs font-black uppercase italic text-white">{isGenerating ? 'RENDER' : 'CREATE'}</span>
            {!isGenerating && <span className="text-[11px] font-black text-white/80">{isAdmin ? '0' : cost}</span>}
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
                <h2 className="text-xl font-black uppercase italic tracking-widest text-white">GEN SETTINGS</h2>
                <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-[#1c1c1c] rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="space-y-4">
                <SettingRow icon="fa-microchip" label="Neural Model" value={modelType} onClick={() => setModelType(modelType === 'Nano Banana' ? 'Nano Banana Pro' : 'Nano Banana')} />
                <SettingRow icon="fa-palette" label="Style Preset" value={selectedStyle.name} onClick={() => { 
                    const idx = STYLES.findIndex(s => s.id === activeStyleId);
                    setActiveStyleId(STYLES[(idx + 1) % STYLES.length].id);
                  }} />
                <SettingRow icon="fa-square-full" label="Aspect Ratio" value={aspectRatio} onClick={() => {
                    const ratios: any[] = ['1:1', '16:9', '9:16', '4:3'];
                    const idx = ratios.indexOf(aspectRatio);
                    setAspectRatio(ratios[(idx + 1) % ratios.length]);
                  }} />
                <SettingRow icon="fa-wand-magic-sparkles" label="Auto Enhance" value={enhancePrompt ? 'ON' : 'OFF'} onClick={() => setEnhancePrompt(!enhancePrompt)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKeyPicker && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowKeyPicker(false)} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-[#121212] border border-cyan-500/30 p-10 rounded-[3rem] max-w-sm w-full text-center space-y-6 shadow-[0_0_80px_rgba(34,211,238,0.1)]">
              <i className="fa-solid fa-lock-open text-cyan-500 text-5xl mb-4"></i>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Otorisasi Berbayar</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Model Pro membutuhkan kunci API Billing Master. Hubungkan kunci Anda sekarang.</p>
              <button onClick={handleKeySelection} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl shadow-xl active:scale-95 text-[10px]">PILIH KUNCI MASTER</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isGenerating && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center">
          <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full mb-8 shadow-lg" />
          <p className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.6em] animate-pulse text-center px-10">Neural Rendering...<br/><span className="text-[8px] text-white opacity-40 italic uppercase tracking-widest">MENGONSTRUKSI VISUAL {modelType}</span></p>
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
