
import React from 'react';
import { motion } from 'framer-motion';

export const RobotHero: React.FC = () => {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[60px]"
      />

      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-[0.5px] border-dashed border-cyan-500/30 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-6 border border-fuchsia-500/10 rounded-full border-t-fuchsia-500/40"
      />

      <motion.div 
        whileHover={{ scale: 1.05 }}
        className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.2)] relative z-10 group cursor-pointer"
      >
        <div className="absolute inset-4 rounded-full border border-cyan-500/5 animate-[spin_10s_linear_infinite]" />
        
        <div className="relative">
          <motion.div
            animate={{ 
              textShadow: [
                "0 0 10px rgba(34,211,238,0.5)",
                "0 0 30px rgba(34,211,238,0.8)",
                "0 0 10px rgba(34,211,238,0.5)"
              ],
              y: [0, -5, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <i className="fa-solid fa-robot text-cyan-400 text-6xl md:text-7xl"></i>
          </motion.div>
          
          <motion.div 
             animate={{ opacity: [0.4, 1, 0.4] }}
             transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 2 }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-cyan-400/30 blur-md rounded-full"
          />
        </div>

        <div className="absolute inset-0">
           {[...Array(6)].map((_, i) => (
             <motion.div
               key={i}
               animate={{ 
                 rotate: 360,
                 scale: [1, 1.2, 1]
               }}
               transition={{ 
                 rotate: { duration: 5 + i, repeat: Infinity, ease: "linear" },
                 scale: { duration: 2, repeat: Infinity, delay: i * 0.3 }
               }}
               className="absolute inset-0 flex items-start justify-center"
             >
               <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee] mt-2" />
             </motion.div>
           ))}
        </div>
      </motion.div>

      <div className="absolute -top-10 h-20 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
      <div className="absolute -bottom-10 h-20 w-[1px] bg-gradient-to-t from-transparent via-fuchsia-500/20 to-transparent" />
    </div>
  );
};
