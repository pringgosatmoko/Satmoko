
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingHero } from './LandingHero.tsx';

interface StartAnimationProps {
  onComplete: () => void;
}

export const StartAnimation: React.FC<StartAnimationProps> = ({ onComplete }) => {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Animasi logo berlangsung selama 2.5 detik
    const timer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(onComplete, 600);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#010409] z-[9999] flex flex-col items-center justify-center font-sans overflow-hidden">
      <AnimatePresence>
        {!isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {/* Menggunakan Logo Master sebagai objek utama animasi */}
            <div className="relative">
              <motion.div
                animate={{ 
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <LandingHero />
              </motion.div>
              
              {/* Efek loading bar minimalis di bawah logo */}
              <div className="w-32 h-0.5 bg-white/5 mx-auto mt-8 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"
                />
              </div>
            </div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="text-[10px] text-white font-black uppercase tracking-[0.6em] mt-10 italic"
            >
              Initializing Studio
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
