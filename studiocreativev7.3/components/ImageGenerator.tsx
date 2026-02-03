
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, getActiveApiKey, rotateApiKey } from '../lib/api';

interface LogEntry {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
}

interface ImageGeneratorProps {
  onBack: () => void;
  lang: 'id' | 'en';
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onBack, lang, userEmail, credits, refreshCredits }) => {
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Nyata (Foto)');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numToGenerate, setNumToGenerate] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [processLogs, setProcessLogs] = useState<LogEntry[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [costPerImage, setCostPerImage] = useState(25);

  useEffect(() => {
    getSystemSettings().then(s => setCostPerProcess(s.cost_image || 25));
  }, []);

  const setCostPerProcess = (val: number) => setCostPerImage(val);

  const totalCost = numToGenerate * costPerImage;

  const t = {
    id: {
      guide: `Buat gambar kualitas 8K dengan AI. Biaya: ${costPerImage} Kredit per gambar.`,
      title: "PANDUAN GAMBAR",
      visualArtist: "Buat Gambar",
      noCredit: "KREDIT HABIS!",
      totalCharge: "TOTAL BIAYA",
      refImage: "Referensi Gambar (Opsional)",
      placeholder: "SIAP_MENERIMA_PERINTAH"
    },
    en: {
      guide: `Generate 8K imagery with AI. Cost: ${costPerImage} Credits per image.`,
      title: "IMAGE GUIDE",
      visualArtist: "Create Image",
      noCredit: "CREDIT EXHAUSTED!",
      totalCharge: "TOTAL COST",
      refImage: "Reference Image (Optional)",
      placeholder: "READY_FOR_COMMAND"
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
          setSourceImages(prev => [...prev, reader.result as string].slice(0, 3));
          addLog("Gambar acuan ditambahkan.", "success");
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const generateSingleVariant = async (parts: any[], retryCount = 0): Promise<string | null> => {
    try {
      const apiKey = getActiveApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: { parts },
        config: { 
          imageConfig: { aspectRatio: aspectRatio as any },
          temperature: 0.95
        }
      });

      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) { 
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
          }
        }
      }
      return null;
    } catch (e: any) {
      const errorMsg = e?.message || JSON.stringify(e);
      // Handle quota (429), server (500), and Rpc failures
      if ((errorMsg.includes('429') || errorMsg.includes('500') || errorMsg.includes('Rpc failed') || errorMsg.includes('quota')) && retryCount < 3) {
        addLog(`Node ${retryCount + 1} sibuk/error, rotasi kunci...`, "warning");
        rotateApiKey();
        const backoff = Math.pow(2, retryCount) * 1000;
        await new Promise(r => setTimeout(r, backoff));
        return generateSingleVariant(parts, retryCount + 1);
      }
      throw e;
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    if (credits < totalCost) {
      addLog(t.noCredit, "error");
      return;
    }
    
    setIsGenerating(true);
    setResultImages([]);
    addLog(`Menghubungkan ke Neural Engine...`);
    
    try {
      const success = await deductCredits(userEmail, totalCost);
      if (!success) {
        addLog("Gagal memotong saldo Master.", "error");
        setIsGenerating(false);
        return;
      }
      refreshCredits();

      const baseParts: any[] = sourceImages.map(img => ({
        inlineData: { 
          data: img.split(',')[1], 
          mimeType: img.match(/data:([^;]+);/)?.[1] || 'image/png' 
        }
      }));
      
      const styledPrompt = `Generate a high-quality 8K image. Subject: ${prompt}. Style: ${style}. Ensure professional composition, lighting, and detail. ${sourceImages.length > 0 ? "Follow the visual reference provided." : ""}`;
      baseParts.push({ text: styledPrompt });

      addLog(`Menggambar ${numToGenerate} varian visual...`);
      
      const tasks = Array.from({ length: numToGenerate }).map(() => generateSingleVariant([...baseParts]));
      const results = await Promise.all(tasks);
      const validResults = results.filter((r): r is string => r !== null);
      
      if (validResults.length > 0) {
        setResultImages(validResults);
        addLog(`${validResults.length} Gambar Master berhasil dibuat!`, "success");
      } else {
        throw new Error("AI tidak mengembalikan output gambar.");
      }
    } catch (e: any) { 
      const errorMsg = e?.message || "";
      addLog(`Gagal: ${errorMsg.substring(0, 45)}...`, "error");
    } finally { 
      setIsGenerating(false); 
      refreshCredits();
    }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="fixed top-6 right-6 z-[400] w-72 lg:w-80 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence initial={false}>
          {processLogs.map((log) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: 50 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 300 }}
              drag="x" 
              dragConstraints={{ left: -300, right: 300 }}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 50) removeLog(log.id); }}
              className={`pointer-events-auto cursor-grab active:cursor-grabbing p-4 rounded-2xl glass-panel border-l-4 backdrop-blur-3xl shadow-2xl flex flex-col gap-1 ${
                log.type === 'success' ? 'border-l-cyan-500 bg-cyan-500/10' :
                log.type === 'error' ? 'border-l-red-500 bg-red-500/20' : 
                log.type === 'warning' ? 'border-l-yellow-500 bg-yellow-500/10' : 'border-l-white/20 bg-white/5'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[7px] font-black uppercase text-slate-500">{log.time}</span>
                <i className="fa-solid fa-arrows-left-right text-[6px] text-slate-500 opacity-40"></i>
              </div>
              <p className="text-[10px] font-bold text-white leading-tight">{log.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl active:scale-95"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-fuchsia-500 text-black border-fuchsia-400' : 'bg-white/5 border-white/5 text-fuchsia-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Visual <span className="text-fuchsia-500">Artist</span></h2>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo Anda</p>
           <p className="text-xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-panel p-6 rounded-[2.5rem] border-fuchsia-500/20 bg-fuchsia-500/5 mb-2 shadow-2xl">
              <p className="text-[9px] font-black uppercase text-fuchsia-400 tracking-[0.4em] mb-3">{t.title}</p>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">
                {t.guide}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5 space-y-6">
          <section className="glass-panel p-8 rounded-[2.5rem] space-y-6 bg-slate-900/40 border-white/5 shadow-2xl">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Gaya Gambar</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-fuchsia-500/50">
                    <option>Nyata (Foto)</option>
                    <option>Animasi 3D</option>
                    <option>Kartun / Anime</option>
                    <option>Seni Lukis</option>
                    <option>Futuristik</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Bentuk Gambar</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-xs text-white outline-none focus:border-fuchsia-500/50">
                    <option>1:1 (KOTAK)</option>
                    <option>16:9 (HD)</option>
                    <option>9:16 (PHONE)</option>
                    <option>4:3 (STANDAR)</option>
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Jumlah Variasi</label>
               <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                 {[1, 2, 4].map((num) => (
                   <button key={num} onClick={() => setNumToGenerate(num)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${numToGenerate === num ? 'bg-fuchsia-500 text-black shadow-lg' : 'text-slate-500'}`}>{num} GAMBAR</button>
                 ))}
               </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">{t.refImage}</label>
              <div className="flex gap-3">
                {sourceImages.map((img, idx) => (
                  <div key={idx} className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden relative group bg-black shadow-lg">
                    <img src={img} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setSourceImages(prev => prev.filter((_, i) => i !== idx))} 
                      className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white"
                    >
                      <i className="fa-solid fa-trash text-[10px]"></i>
                    </button>
                  </div>
                ))}
                {sourceImages.length < 3 && (
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center cursor-pointer hover:border-fuchsia-500/40 hover:bg-white/5 transition-all group">
                    <i className="fa-solid fa-plus text-slate-700 group-hover:text-fuchsia-500 transition-colors"></i>
                    <input type="file" onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-widest">Deskripsi Gambar</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white focus:border-fuchsia-500/50 outline-none resize-none leading-relaxed" placeholder="Contoh: Kucing astronot sedang memancing bintang di angkasa..." />
            </div>

            <div className="p-4 rounded-2xl bg-fuchsia-500/5 border border-fuchsia-500/10 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-fuchsia-500 uppercase tracking-widest">{t.totalCharge}</p>
                <p className="text-lg font-black italic text-white leading-none">{totalCost} <span className="text-[10px] text-slate-500">CR</span></p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sisa Saldo</p>
                <p className={`text-[11px] font-black ${credits < totalCost ? 'text-red-500' : 'text-slate-400'}`}>
                  {(credits - totalCost).toLocaleString()} CR
                </p>
              </div>
            </div>
            
            <button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim() || credits < totalCost} 
              className="w-full py-6 bg-white text-black font-black uppercase rounded-[1.5rem] hover:bg-fuchsia-400 transition-all shadow-2xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
            >
              {isGenerating ? "MENGKONSTRUKSI..." : credits < totalCost ? t.noCredit : `MULAI BUAT GAMBAR`}
            </button>
          </section>
        </div>

        <div className="xl:col-span-7">
          <div className="glass-panel min-h-[600px] rounded-[3.5rem] flex flex-col items-center justify-center p-8 bg-black/30 border-white/5 shadow-2xl overflow-hidden relative">
            {resultImages.length > 0 ? (
              <div className={`grid gap-4 w-full h-full ${resultImages.length === 1 ? 'grid-cols-1' : resultImages.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'}`}>
                {resultImages.map((img, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group rounded-3xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                    <img src={img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 backdrop-blur-sm">
                       <a href={img} download={`satmoko_gen_${Date.now()}_${idx}.png`} className="w-12 h-12 rounded-full bg-fuchsia-500 text-black flex items-center justify-center hover:bg-white transition-all shadow-lg shadow-fuchsia-500/20"><i className="fa-solid fa-download"></i></a>
                       <button onClick={() => window.open(img, '_blank')} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 backdrop-blur-md border border-white/10"><i className="fa-solid fa-expand"></i></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center">
                <i className="fa-solid fa-wand-magic-sparkles text-8xl mb-6"></i>
                <p className="text-[11px] font-black uppercase tracking-[0.8em]">{t.placeholder}</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(217,70,239,0.4)]" />
                <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.4em] animate-pulse">NEURAL_SYNTHESIS_ACTIVE</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
