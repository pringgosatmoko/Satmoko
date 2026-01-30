
import React from 'react';
import { motion } from 'framer-motion';

export const RobotHero: React.FC = () => {
  return (
    <div className="relative w-full max-w-[340px] aspect-video flex items-center justify-center mb-4 overflow-visible">
      {/* Background Frame (Video Player Style) */}
      <div className="absolute inset-0 bg-slate-900/40 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1546776230-bb862948336a?auto=format&fit=crop&q=80&w=800" 
          className="w-full h-full object-cover opacity-30 grayscale" 
          alt="tech lab"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
        {/* Scan lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>
      </div>

      {/* Rotating HUD Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute w-40 h-40 border-[0.5px] border-dashed border-cyan-500/20 rounded-full"
      />
      
      {/* Central Robot Core */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="w-32 h-32 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.3)] relative overflow-hidden group"
      >
        {/* Eye Glow */}
        <div className="flex gap-4">
          <motion.div 
             animate={{ 
               boxShadow: ["0 0 10px #22d3ee", "0 0 25px #22d3ee", "0 0 10px #22d3ee"],
               scale: [1, 1.1, 1]
             }}
             transition={{ duration: 2, repeat: Infinity }}
             className="w-4 h-4 rounded-full bg-cyan-400"
          ></motion.div>
          <motion.div 
             animate={{ 
               boxShadow: ["0 0 10px #22d3ee", "0 0 25px #22d3ee", "0 0 10px #22d3ee"],
               scale: [1, 1.1, 1]
             }}
             transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
             className="w-4 h-4 rounded-full bg-cyan-400"
          ></motion.div>
        </div>
        
        {/* HUD Elements Overlay */}
        <motion.div 
          animate={{ top: ["-100%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-cyan-400/20 blur-sm z-20"
        />
      </motion.div>

      {/* Title Tag */}
      <div className="absolute -bottom-2 px-6 py-1 bg-orange-600 rounded-full shadow-lg">
        <p className="text-[8px] font-black italic uppercase tracking-widest text-white">Neural Director Hub</p>
      </div>
    </div>
  );
};
