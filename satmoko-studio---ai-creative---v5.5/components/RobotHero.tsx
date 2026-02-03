
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RobotHeroProps {
  isLoaded: boolean;
  isCompact?: boolean;
}

export const RobotHero: React.FC<RobotHeroProps> = ({ isLoaded, isCompact = false }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [bootPhase, setBootPhase] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  const messages = [
    "Neural Link: ESTABLISHING",
    "Identity Scan: IN PROGRESS",
    "Studio Creative: SYNCHRONIZING",
    "Master Authorization: REQUIRED",
    "System Ready: STANDBY"
  ];

  useEffect(() => {
    if (isLoaded) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2000);
      
      const bootTimer = setInterval(() => {
        setBootPhase(p => (p < 5 ? p + 1 : p));
      }, 400);

      return () => {
        clearInterval(interval);
        clearInterval(bootTimer);
      };
    }
  }, [isLoaded]);
  
  const robotImageUrl = "https://cdni.iconscout.com/illustration/premium/thumb/robot-artificial-intelligence-illustration-download-in-svg-png-gif-formats--ai-cyborg-technology-concept-pack-science-fiction-illustrations-5381861.png?f=webp"; 

  return (
    <motion.div 
      layout
      className={`relative flex flex-col items-center w-full max-w-md mx-auto overflow-visible transition-all duration-1000 ${isCompact ? 'py-4 min-h-[300px]' : 'py-10 min-h-[450px]'}`}
    >
      {/* Background Aura Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div 
          animate={{ 
            scale: isCompact ? [1, 1.1, 1] : [1, 1.3, 1], 
            opacity: isCompact ? [0.1, 0.2, 0.1] : [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-96 h-96 bg-cyan-500 rounded-full blur-[120px]"
        />
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center w-full"
      >
        {/* Robot Image Container */}
        <motion.div 
          layout
          className={`relative group flex items-center justify-center transition-all duration-1000 ${isCompact ? 'h-48 w-48 mb-4' : 'h-72 w-72 mb-10'}`}
        >
          {/* Tech Rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-cyan-500/10 rounded-full border-dashed scale-125"
          />
          
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-20 flex items-center justify-center w-full h-full"
          >
            {!imageError ? (
              <img 
                src={robotImageUrl} 
                alt="Satmoko AI Core" 
                onError={() => setImageError(true)}
                className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(34,211,238,0.4)] group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-40 h-40 bg-slate-900/80 rounded-[3rem] border border-cyan-500/40 backdrop-blur-3xl flex items-center justify-center shadow-2xl">
                <i className="fa-solid fa-microchip text-4xl text-cyan-400"></i>
              </div>
            )}
            
            {/* Scanning Effect */}
            <motion.div 
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[10%] right-[10%] h-[1px] bg-cyan-400/50 shadow-[0_0_15px_#22d3ee] z-30"
            />
          </motion.div>
        </motion.div>

        {/* Branding */}
        <div className="flex flex-col items-center gap-4 w-full">
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 font-display font-black text-[9px] uppercase tracking-[0.8em] italic text-center"
          >
            Ora Ngapak Ora Penak
          </motion.div>

          <motion.h2 
            layout
            className={`${isCompact ? 'text-3xl' : 'text-5xl'} font-display font-black text-white uppercase italic tracking-tighter transition-all duration-1000`}
          >
            SATMOKO <span className="text-cyan-400">STUDIO</span>
          </motion.h2>

          {!isCompact && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex flex-col items-center gap-4 bg-black/40 px-8 py-4 rounded-[2rem] border border-white/5 backdrop-blur-3xl mt-2 w-full max-w-[320px]"
            >
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <motion.div 
                    key={i}
                    className={`w-6 h-1 rounded-full transition-all duration-500 ${bootPhase >= i ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-slate-800'}`}
                  />
                ))}
              </div>
              <div className="h-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[8px] font-mono font-black uppercase tracking-[0.4em] text-cyan-500/60"
                  >
                    {messages[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
