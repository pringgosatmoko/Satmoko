
import React from 'react';
import { motion } from 'framer-motion';

interface LogoHeroProps {
  isLoaded: boolean;
}

export const LogoHero: React.FC<LogoHeroProps> = ({ isLoaded }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={isLoaded ? { opacity: 1 } : {}}
      transition={{ duration: 1 }}
      className="flex flex-col items-center select-none w-full"
    >
      {/* Title & Branding */}
      <div className="text-center relative">
        <motion.h1 
          initial={{ letterSpacing: "0.5em", opacity: 0 }}
          animate={{ letterSpacing: "0.1em", opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic leading-none"
        >
          SATMOKO <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">STUDIO</span>
        </motion.h1>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.8, delay: 1 }}
          className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4 mb-2"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]"
        >
          AI CREATIVE DIVISION • V5.0
        </motion.p>
      </div>
    </motion.div>
  );
};
