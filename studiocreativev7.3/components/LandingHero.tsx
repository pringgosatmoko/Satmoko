
import React from 'react';
import { motion } from 'framer-motion';

export const LandingHero: React.FC = () => {
  return (
    <div className="relative w-full max-w-[280px] md:max-w-[400px] aspect-square flex items-center justify-center mb-0 overflow-hidden pointer-events-none">
      {/* Cinematic Pulse Rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 0.15, 0], 
            scale: [0.8, 1.1 + i * 0.1, 1.3],
            borderWidth: ["1px", "2px", "1px"]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            delay: i * 1.2,
            ease: "easeOut" 
          }}
          className="absolute inset-0 border border-cyan-500/20 rounded-full"
        />
      ))}

      {/* Main Core Visual - Slightly smaller for better UX */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 w-28 h-28 md:w-48 md:h-48 pointer-events-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/10 to-fuchsia-600/10 blur-2xl animate-pulse rounded-full"></div>
        
        <div className="relative w-full h-full glass-panel rounded-full border border-white/10 flex items-center justify-center bg-black/60 overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.1)]">
          {/* Cyber Scanning Grid */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[length:15px_15px]"></div>
          
          <motion.div
            animate={{ 
              rotateY: [0, 180, 360],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="relative z-20"
          >
            <i className="fa-solid fa-atom text-4xl md:text-6xl text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"></i>
          </motion.div>

          {/* Vertical Scan Bar */}
          <motion.div 
            animate={{ top: ["-10%", "110%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-0.5 bg-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.3)] z-30"
          />
        </div>
      </motion.div>

      {/* Decorative HUD Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-8 right-8 flex flex-col items-end gap-1"
        >
          <div className="w-8 h-0.5 bg-cyan-500/40 rounded-full"></div>
          <div className="w-5 h-0.5 bg-cyan-500/20 rounded-full"></div>
          <p className="text-[5px] font-black text-cyan-500/60 uppercase tracking-widest mt-1">CORE_SYS</p>
        </motion.div>

        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-8 left-8 flex flex-col items-start gap-1"
        >
          <p className="text-[5px] font-black text-fuchsia-500/60 uppercase tracking-widest mb-1">NODE_LINK</p>
          <div className="w-5 h-0.5 bg-fuchsia-500/20 rounded-full"></div>
          <div className="w-8 h-0.5 bg-fuchsia-500/40 rounded-full"></div>
        </motion.div>
      </div>
    </div>
  );
};
