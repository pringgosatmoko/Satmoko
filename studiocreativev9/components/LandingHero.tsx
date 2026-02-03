
import React from 'react';
import { motion } from 'framer-motion';

export const LandingHero: React.FC = () => {
  return (
    <div className="relative w-full max-w-[240px] md:max-w-[320px] aspect-square flex items-center justify-center select-none overflow-visible">
      
      {/* Background Glow & Flare */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-purple-500/10 blur-[80px] animate-pulse"></div>

      {/* NEON PORTAL RINGS - Layers of HUD */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute w-[100%] h-[100%] rounded-full border-[0.5px] border-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.05)]"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute w-[95%] h-[95%] rounded-full border-[1px] border-dashed border-cyan-500/20"
      />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-[90%] h-[90%] rounded-full border-2 border-transparent border-t-cyan-400/30 border-b-purple-500/30 shadow-[0_0_30px_rgba(34,211,238,0.1)]"
      />

      {/* THE 3D LOGO CONTAINER */}
      <motion.div 
        animate={{ 
          y: [0, -12, 0],
          rotateY: [-8, 8, -8],
          rotateX: [4, -4, 4]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative w-[75%] h-[75%] flex items-center justify-center perspective-[2000px]"
      >
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
          <defs>
            <linearGradient id="silver-grad-pro" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#64748b', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* S - BRAIN CIRCUIT SIDE */}
          <g transform="translate(40, 60) scale(1.1)">
             <path 
                d="M140 60 C80 60, 60 120, 100 160 S160 220, 100 260 S20 200, 20 200" 
                fill="none" 
                stroke="url(#silver-grad-pro)" 
                strokeWidth="24" 
                strokeLinecap="round"
                filter="url(#glow)"
             />
             <circle cx="140" cy="60" r="6" fill="#22d3ee" className="animate-pulse" />
             <circle cx="20" cy="200" r="6" fill="#22d3ee" />
             <path d="M140 60 L180 20" stroke="#22d3ee" strokeWidth="1.5" opacity="0.4" strokeDasharray="4 2" />
             <path d="M20 200 L-20 240" stroke="#22d3ee" strokeWidth="1.5" opacity="0.4" strokeDasharray="4 2" />
          </g>

          {/* A - CAMERA LENS SIDE */}
          <g transform="translate(180, 80) scale(1.1)">
             <path 
                d="M20 200 L80 40 L140 200" 
                fill="none" 
                stroke="url(#silver-grad-pro)" 
                strokeWidth="24" 
                strokeLinecap="round"
                filter="url(#glow)"
             />
             <rect x="62" y="10" width="40" height="15" rx="4" fill="url(#silver-grad-pro)" />
             
             {/* Camera Lens in Center */}
             <g transform="translate(80, 140)">
                <circle r="42" fill="#020617" stroke="url(#silver-grad-pro)" strokeWidth="4" />
                <circle r="30" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
                <motion.circle 
                  r="15" 
                  fill="#22d3ee" 
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <circle cx="-10" cy="-10" r="4" fill="#fff" opacity="0.5" />
             </g>
          </g>
        </svg>

        {/* Dynamic Light Reflection */}
        <motion.div 
          animate={{ x: [-400, 600] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
          className="absolute w-16 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[45deg] pointer-events-none"
        />
      </motion.div>

      {/* Vertical HUD Lines */}
      <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 h-24 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"></div>
      <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-24 w-[1px] bg-gradient-to-b from-transparent via-purple-500/30 to-transparent"></div>
    </div>
  );
};
