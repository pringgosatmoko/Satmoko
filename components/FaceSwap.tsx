
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { deductCredits, getSystemSettings, rotateApiKey, getActiveApiKey, isAdmin as checkAdmin, logActivity } from '../lib/api';

interface FaceSwapProps {
  onBack: () => void;
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
}

export const FaceSwap: React.FC<FaceSwapProps> = ({ onBack, userEmail, credits, refreshCredits }) => {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [engineType, setEngineType] = useState<'Standard' | 'Pro'>('Standard');
  const [cost, setCost] = useState(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = checkAdmin(userEmail);

  useEffect(() => {
    getSystemSettings().then(s => setCost(s.cost_image ? s.cost_image * 2 : 50));
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'target') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'face') setFaceImage(reader.result as string);
        else setTargetImage(reader.result as string);
        setResult(null);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
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

  const processSwap = async (retryCount = 0) => {
    setErrorMsg(null);
    if (!faceImage || !targetImage) {
      setErrorMsg("UNGGAH KEDUA GAMBAR TERLEBIH DAHULU!");
      return;
    }

    if (engineType === 'Pro' && window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      setShowKeyPicker(true);
      return;
    }

    if (!isAdmin && credits < cost) {
      setErrorMsg(`SALDO TIDAK CUKUP! BUTUH ${cost} CR.`);
      return;
    }

    setIsProcessing(true);

    try {
      if (retryCount === 0 && !isAdmin) {
        const success = await deductCredits(userEmail, cost);
        if (!success) throw new Error("GAGAL MEMOTONG KREDIT.");
        refreshCredits();
      }

      const apiKey = getActiveApiKey();
      if (!apiKey) throw new Error("API KEY TIDAK DITEMUKAN.");

      const ai = new GoogleGenAI({ apiKey });
      const modelName = engineType === 'Pro' ? 'gemini-1.5-pro' : 'gemini-2.0-flash';
      
      const promptText = `
        DEEPFAKE MISSION: 
        1. Extract the face identity from the FIRST IMAGE.
        2. Replace the face of the person in the SECOND IMAGE with the identity from the first image.
        3. Match facial expressions, lighting conditions, skin texture, and perspective perfectly.
        4. Preserve the background and hair of the second image.
        5. Output must be a professional, seamless, and high-fidelity face swap result.
      `;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: faceImage.split(',')[1], mimeType: 'image/png' } },
            { inlineData: { data: targetImage.split(',')[1], mimeType: 'image/png' } },
            { text: promptText }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: modelName === 'gemini-2.0-flash' ? '1K' : undefined
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
        setResult(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        logActivity('FACE_SWAP_SUCCESS', `User ${userEmail} generated a face swap using ${modelName}`);
      } else {
        throw new Error("MESIN GAGAL MENGHASILKAN VISUAL. COBA GAMBAR LAIN.");
      }
    } catch (e: any) {
      console.error("[NeuralHub] FaceSwap Error:", e);
      const msg = String(e?.message || JSON.stringify(e) || "");
      
      if (msg.includes("Requested entity was not found.") && engineType === 'Pro') {
        setShowKeyPicker(true);
      } else if ((msg.includes('429') || msg.includes('quota')) && retryCount < 2) {
        rotateApiKey();
        return processSwap(retryCount + 1);
      } else {
        setErrorMsg(msg.toUpperCase() || "KEGAGALAN NEURAL RECONSTRUCTION.");
      }
    } finally {
      setIsProcessing(false);
      refreshCredits();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-white overflow-hidden">
      <header className="px-6 pt-6 flex flex-col items-center flex-shrink-0">
        <div className="w-full flex justify-between items-center mb-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center active:scale-90 transition-transform">
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
             <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Face Swap <span className="text-cyan-400">Deepfake</span></h1>
          </div>
          <button onClick={() => setShowHelp(true)} className="w-10 h-10 rounded-full glass-imagine flex items-center justify-center text-cyan-400">
            <i className="fa-solid fa-question text-sm"></i>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Neural Identity Replacement</p>
      </header>

      <main className="flex-1 px-6 space-y-8 overflow-y-auto no-scrollbar py-8 flex flex-col items-center">
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase text-red-500 text-center">
              ERROR: {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Source Identity</p>
            <label className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/5 bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-white/5 transition-all shadow-2xl group">
              {faceImage ? (
                <img src={faceImage} className="w-full h-full object-cover" />
              ) : (
                <>
                  <i className="fa-solid fa-face-smile text-3xl text-slate-800 group-hover:text-cyan-500 transition-colors mb-2"></i>
                  <span className="text-[7px] font-black text-slate-800 uppercase">Pilih Wajah</span>
                </>
              )}
              <input type="file" onChange={e => handleUpload(e, 'face')} className="hidden" accept="image/*" />
            </label>
          </div>
          <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Target Body</p>
            <label className="aspect-square rounded-[2.5rem] border-2 border-dashed border-white/5 bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-white/5 transition-all shadow-2xl group">
              {targetImage ? (
                <img src={targetImage} className="w-full h-full object-cover" />
              ) : (
                <>
                  <i className="fa-solid fa-user text-3xl text-slate-800 group-hover:text-cyan-500 transition-colors mb-2"></i>
                  <span className="text-[7px] font-black text-slate-800 uppercase">Pilih Target</span>
                </>
              )}
              <input type="file" onChange={e => handleUpload(e, 'target')} className="hidden" accept="image/*" />
            </label>
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl space-y-6">
               <div className="relative group">
                 <img src={result} className="w-full rounded-[3rem] border border-cyan-500/20 shadow-[0_0_60px_rgba(34,211,238,0.2)]" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-[3rem] flex items-center justify-center gap-4">
                   <button onClick={() => setResult(null)} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><i className="fa-solid fa-rotate-left"></i></button>
                   <a href={result} download="faceswap_satmoko.png" className="w-14 h-14 bg-cyan-500 text-black rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><i className="fa-solid fa-download"></i></a>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-lg space-y-6">
           <div className="flex bg-[#121212] p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setEngineType('Standard')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${engineType === 'Standard' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Standard</button>
              <button onClick={() => setEngineType('Pro')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${engineType === 'Pro' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-600'}`}>High Fidelity (Pro)</button>
           </div>
           
           <button 
            onClick={() => processSwap()} 
            disabled={!faceImage || !targetImage || isProcessing}
            className="w-full py-6 bg-white text-black font-black uppercase rounded-[2rem] text-[11px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all disabled:opacity-20"
          >
            {isProcessing ? "SYNTHESIZING IDENTITY..." : `EXECUTE SWAP (${isAdmin ? '0' : cost} CR)`}
          </button>
        </div>
      </main>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelp(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0d1117] border border-white/10 p-10 rounded-[3.5rem] max-w-sm w-full shadow-2xl text-center">
               <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-400 border border-cyan-500/20">
                  <i className="fa-solid fa-masks-theater text-2xl"></i>
               </div>
               <h3 className="text-xl font-black text-white mb-4 uppercase italic italic tracking-tighter">DEEPFAKE GUIDE</h3>
               <p className="text-[11px] text-slate-400 font-bold leading-relaxed mb-8 uppercase tracking-widest">
                 1. Unggah foto wajah Master (Source).<br/><br/>
                 2. Unggah foto badan/objek (Target).<br/><br/>
                 3. Neural Engine akan mencangkok identitas wajah Source ke Target secara presisi.
               </p>
               <button onClick={() => setShowHelp(false)} className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl">MENGERTI, MASTER!</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Key Picker for Pro mode */}
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

      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-10">
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)]" />
             <motion.div animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border-2 border-white/5 border-b-white/20 rounded-full" />
          </div>
          <p className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.6em] animate-pulse text-center px-10">Neural Identity Reconstruction...<br/><span className="text-[8px] text-white opacity-40 mt-3 block italic tracking-widest">MENSINKRONISASI GEOMETRI WAJAH</span></p>
        </div>
      )}
    </div>
  );
};
