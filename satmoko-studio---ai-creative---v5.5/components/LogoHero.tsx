
import React from 'react';
import { motion } from 'framer-motion';

interface LogoHeroProps {
  isLoaded: boolean;
}

export const LogoHero: React.FC<LogoHeroProps> = ({ isLoaded }) => {
  return (
    <div className="relative flex flex-col items-center w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 40, damping: 20, delay: 0.4 }}
        className="relative"
      >
        {/* Subtle Branding Rings */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/5 scale-110 ring-pulse"></div>
        <div className="absolute inset-0 rounded-full border border-purple-500/5 scale-125 ring-pulse" style={{ animationDelay: '2s' }}></div>

        {/* The Logo Hero Element */}
        <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
          {/* Central Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10 glass-panel w-40 h-40 rounded-[2.5rem] flex flex-col items-center justify-center border-white/10 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="text-center p-4 relative z-10">
              <div className="text-white text-6xl font-display font-black mb-2 tracking-tighter leading-none">S<span className="text-cyan-400">A</span></div>
              <div className="text-slate-400 text-[8px] font-black uppercase tracking-[0.5em] mt-2">Satmoko Studio</div>
              <div className="w-6 h-0.5 bg-cyan-500/40 mx-auto mt-2"></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
