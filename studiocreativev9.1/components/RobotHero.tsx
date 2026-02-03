
import React from 'react';
import { motion } from 'framer-motion';

export const RobotHero: React.FC = () => {
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
      {/* Outer Rotating HUD Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-[0.5px] border-dashed border-cyan-500/30 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-cyan-400/10 rounded-full border-t-cyan-400/50"
      />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 border border-fuchsia-500/10 rounded-full border-b-fuchsia-500/50"
      />

      {/* Central Core Container */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center bg-black/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(34,211,238,0.3)] relative overflow-hidden group"
      >
        {/* Scan Line Effect */}
        <motion.div 
          animate={{ top: ["-100%", "100%", "-100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-1 bg-cyan-400/60 blur-sm z-20"
        />
        
        {/* Glowing Core Icon */}
        <div className="relative z-10">
          <motion.div
            animate={{ 
              textShadow: [
                "0 0 10px rgba(34,211,238,0.5)",
                "0 0 30px rgba(34,211,238,0.9)",
                "0 0 10px rgba(34,211,238,0.5)"
              ],
              scale: [1, 1.08, 1],
              rotateY: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <i className="fa-solid fa-brain text-cyan-400 text-5xl md:text-6xl"></i>
          </motion.div>
        </div>

        {/* Inner Glitch Particles */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                x: [0, Math.random() * 60 - 30, 0],
                y: [0, Math.random() * 60 - 30, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: Math.random() * 3 + 2, repeat: Infinity }}
              className="absolute w-1 h-1 bg-cyan-200 rounded-full"
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%` 
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Decorative HUD Elements */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-6">
        <motion.div 
          animate={{ opacity: [0.2, 1, 0.2], width: [20, 50, 20] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="h-0.5 bg-cyan-500/60 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.6)]"
        />
        <motion.div 
          animate={{ opacity: [0.2, 1, 0.2], width: [20, 50, 20] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className="h-0.5 bg-fuchsia-500/60 rounded-full shadow-[0_0_15px_rgba(217,70,239,0.6)]"
        />
      </div>

      {/* Orbiting Energy Dots */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div 
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full absolute shadow-[0_0_8px_#22d3ee]"
              style={{ top: '0', left: '50%', marginLeft: '-3px' }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
