
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Update ref jika onComplete berubah (meskipun sudah di-memoize di App.tsx)
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fullLogs = [
    "09:26:08 Running build in Washington, D.C., USA",
    "09:26:08 Build machine configuration: 2 cores, 8 GB",
    "09:26:08 Cloning github.com/pringgosatmoko/Creativestudio",
    "09:26:08 Cloning completed: 171.000ms",
    "09:26:09 Running \"vercel build\"",
    "09:26:10 Vercel CLI 50.4.5",
    "09:26:10 Installing dependencies...",
    "09:26:30 Compiling TypeScript modules...",
    "09:26:35 Optimized bundle generated (342KB)",
    "09:26:38 Initializing Satellite Nodes...",
    "09:26:40 Build Success. Deploying to Satmoko Hub...",
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullLogs.length) {
        setLogs(prev => [...prev, fullLogs[index]]);
        index++;
      } else {
        clearInterval(interval);
        // Hapus jeda kosong yang menyebabkan "Blank Hitam"
        setTimeout(() => {
          setIsFinished(true);
          // Berikan sedikit waktu bagi framer-motion untuk memulai animasi exit
          // Lalu panggil onComplete untuk mengganti komponen di App.tsx
          setTimeout(() => {
            onCompleteRef.current();
          }, 400); 
        }, 800);
      }
    }, 90);

    return () => clearInterval(interval);
  }, []); // Kosongkan dependency agar hanya jalan sekali

  return (
    <div className="fixed inset-0 bg-[#010409] z-[999] flex flex-col items-center justify-center p-6 font-mono overflow-hidden">
      <AnimatePresence>
        {!isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            <div className="mb-8 flex items-center justify-between">
               <div>
                  <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter text-cyan-500 leading-none">System Boot</h1>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Satmoko Studio Build Engine V5.4</p>
               </div>
               <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                  <span className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">Neural_Sync</span>
               </div>
            </div>

            <div className="glass-panel rounded-[2rem] bg-[#0d1117]/80 border border-white/5 overflow-hidden shadow-2xl">
              <div className="bg-white/5 p-4 border-b border-white/5 flex items-center gap-3">
                <i className="fa-solid fa-terminal text-[10px] text-cyan-500"></i>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Core Deployment Logs</span>
              </div>

              <div className="p-6 space-y-1.5 h-[320px] overflow-y-auto no-scrollbar bg-black/40 text-left">
                {logs.map((log, i) => {
                  const logStr = String(log || '');
                  return (
                    <motion.p 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className={`text-[10px] leading-relaxed tracking-wider ${logStr.includes('Success') ? 'text-green-400 font-bold' : 'text-slate-400'}`}
                    >
                      <span className="text-slate-700 mr-2">>></span> {logStr}
                    </motion.p>
                  );
                })}
                {!isFinished && (
                  <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-1.5 h-3 bg-cyan-500 inline-block ml-1"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
