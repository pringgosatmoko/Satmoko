
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingHero } from './LandingHero.tsx';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Animasi logo berlangsung selama 3.5 detik untuk efek cinematic
    const timer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(onComplete, 800);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#010409] z-[9999] flex flex-col items-center justify-center font-sans overflow-hidden">
      <AnimatePresence>
        {!isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            {/* Logo Master Section */}
            <div className="relative group">
              <motion.div
                animate={{ 
                  opacity: [0.6, 1, 0.6],
                  scale: [1, 1.02, 1],
                  filter: ["drop-shadow(0 0 10px rgba(34,211,238,0.2))", "drop-shadow(0 0 30px rgba(34,211,238,0.5))", "drop-shadow(0 0 10px rgba(34,211,238,0.2))"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <LandingHero />
              </motion.div>
              
              {/* Scanline effect */}
              <motion.div 
                animate={{ top: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none z-10"
              />
            </div>
            
            <div className="mt-12 space-y-4 flex flex-col items-center">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 240 }}
                transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent relative"
              >
                 <motion.div 
                   animate={{ left: ["0%", "100%"] }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                   className="absolute top-[-2px] w-4 h-1 bg-cyan-400 blur-[2px]"
                 />
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="text-[9px] text-white font-black uppercase tracking-[0.8em] italic"
              >
                Syncing Neural Creative Hub
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Background Particles or Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};
