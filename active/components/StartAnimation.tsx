
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
    "NODE_READY_V9.5_ULTIMATE"
  ];

  useEffect(() => {
    let sIdx = 0;
    const interval = setInterval(() => {
      if (sIdx < statuses.length) {
        setStatusText(statuses[sIdx]);
        sIdx++;
      }
    }, 600);

    const progInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progInterval);
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 1;
      });
    }, 25);

    return () => {
      clearInterval(interval);
      clearInterval(progInterval);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 1 }}
      className="fixed inset-0 bg-[#010409] z-[9999] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#22d3ee 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}>
      </div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative flex flex-col items-center"
      >
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-r-2 border-cyan-500/30 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 border-b-2 border-l-2 border-fuchsia-500/20 rounded-full"
          />
          
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl border border-white/5 shadow-[0_0_100px_rgba(34,211,238,0.1)] relative overflow-hidden group">
            <motion.div 
              animate={{ top: ["-100%", "100%", "-100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-cyan-500/40 blur-sm z-20"
            />
            
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                filter: ["drop-shadow(0 0 5px #22d3ee)", "drop-shadow(0 0 20px #22d3ee)", "drop-shadow(0 0 5px #22d3ee)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <i className="fa-solid fa-brain text-cyan-400 text-5xl md:text-6xl z-10"></i>
            </motion.div>
          </div>
        </div>

        <div className="mt-16 w-72 text-center">
          <div className="flex justify-between items-end mb-3">
             <motion.p 
               key={statusText}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.4em] font-mono"
             >
               {statusText}
             </motion.p>
             <p className="text-[12px] font-black text-slate-500 font-mono italic">{progress}%</p>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_#22d3ee]"
            />
          </div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-12 left-12 opacity-10 font-mono text-[9px] text-cyan-400 space-y-1 hidden md:block">
        <p>SYSTEM_LOAD: STABLE</p>
        <p>KERNEL_V: 9.5.0</p>
        <p>ENCRYPTION: AES_256</p>
      </div>
      <div className="absolute bottom-12 right-12 opacity-10 font-mono text-[9px] text-cyan-400 space-y-1 text-right hidden md:block">
        <p>NODE_ID: SATMOKO_PRIMARY</p>
        <p>GEO_LOC: IND_WEST_JAVA</p>
        <p>SEC_LEVEL: MASTER_ACCESS</p>
      </div>
    </motion.div>
  );
};
