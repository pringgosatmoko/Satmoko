
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  const [statusText, setStatusText] = useState("INITIALIZING_CORE...");
  const [progress, setProgress] = useState(0);

  const statuses = [
    "BOOTING_SATMOKO_HUB...",
    "SYNCING_NEURAL_WAVES...",
    "DECRYPTING_BIO_KEYS...",
    "ACCESS_AUTHORIZED...",
    "NODE_READY_V5.4"
  ];

  useEffect(() => {
    let sIdx = 0;
    const interval = setInterval(() => {
      if (sIdx < statuses.length) {
        setStatusText(statuses[sIdx]);
        sIdx++;
      }
    }, 800);

    const progInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 35);

    return () => {
      clearInterval(interval);
      clearInterval(progInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#010409] z-[999] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Particles Simulation */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:1s]"></div>
        <div className="absolute top-2/3 left-1/2 w-1 h-1 bg-cyan-400 rounded-full animate-ping [animation-delay:2s]"></div>
      </div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0, filter: "blur(20px)" }}
        className="relative flex flex-col items-center"
      >
        {/* Cinematic HUD Ring */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-r-2 border-cyan-500/20 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border-b-2 border-l-2 border-cyan-500/10 rounded-full"
          />
          
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl border border-white/5 shadow-[0_0_100px_rgba(34,211,238,0.1)] relative overflow-hidden group">
            {/* Scan Line Effect */}
            <motion.div 
              animate={{ top: ["-100%", "100%", "-100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-cyan-500/30 blur-sm z-20"
            />
            
            <motion.i 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="fa-solid fa-brain text-cyan-400 text-5xl z-10"
            ></motion.i>
          </div>
        </div>

        {/* Progress Display */}
        <div className="mt-12 w-64 text-center">
          <div className="flex justify-between items-end mb-2">
             <motion.p 
               key={statusText}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="text-[9px] font-black uppercase text-cyan-500/80 tracking-[0.3em] font-mono"
             >
               {statusText}
             </motion.p>
             <p className="text-[10px] font-black text-slate-500 font-mono">{progress}%</p>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"
            />
          </div>
        </div>
      </motion.div>
      
      {/* Decorative Matrix-style numbers */}
      <div className="absolute bottom-10 left-10 opacity-5 font-mono text-[8px] text-cyan-400 space-y-1">
        <p>01001010 10101111</p>
        <p>11100010 01010101</p>
        <p>00110101 11001100</p>
      </div>
      <div className="absolute bottom-10 right-10 opacity-5 font-mono text-[8px] text-cyan-400 space-y-1 text-right">
        <p>NODE_IP: 192.168.1.101</p>
        <p>LATENCY: 12ms</p>
        <p>SEC_LEVEL: MASTER</p>
      </div>
    </div>
  );
};
