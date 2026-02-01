
import React from 'react';
import { motion } from 'framer-motion';

export const LandingHero: React.FC = () => {
  return (
    <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center overflow-visible select-none">
      
      {/* Dynamic Background Glow - Matching the Image Colors */}
      <motion.div 
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-fuchsia-500/20 blur-[80px] rounded-full"
      ></motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          <defs>
            <linearGradient id="neon-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="metallic" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* Outer Neon Ring */}
          <circle 
            cx="200" cy="200" r="180" 
            fill="none" 
            stroke="url(#neon-ring)" 
            strokeWidth="3" 
            strokeDasharray="10 5"
            className="opacity-40"
          />
          <motion.circle 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            cx="200" cy="200" r="175" 
            fill="none" 
            stroke="url(#neon-ring)" 
            strokeWidth="1" 
            className="opacity-20"
          />

          {/* Main Logo Container */}
          <g transform="translate(60, 80) scale(0.7)">
            {/* The "S" Circuit Brain Half */}
            <path 
              d="M150 50 C50 50, 50 150, 100 200 S150 300, 50 300" 
              fill="none" 
              stroke="url(#metallic)" 
              strokeWidth="40" 
              strokeLinecap="round"
            />
            {/* Circuit Nodes */}
            <circle cx="50" cy="300" r="12" fill="#22d3ee" />
            <circle cx="100" cy="200" r="8" fill="#ffffff" />
            <path d="M40 100 L80 100 M40 150 L80 150" stroke="#22d3ee" strokeWidth="4" />

            {/* The "A" and Camera Half */}
            <g transform="translate(180, 0)">
              <path 
                d="M40 300 L120 50 L200 300" 
                fill="none" 
                stroke="url(#metallic)" 
                strokeWidth="40" 
                strokeLinecap="round"
              />
              {/* Camera Icon Overlay */}
              <rect x="80" y="160" width="100" height="70" rx="10" fill="url(#metallic)" />
              <circle cx="130" cy="195" r="25" fill="#010409" stroke="#ffffff" strokeWidth="4" />
              <path d="M115 195 L145 195 M130 180 L130 210" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.5" />
              {/* Shutter Detail */}
              <circle cx="130" cy="195" r="10" fill="#22d3ee" className="animate-pulse" />
            </g>
          </g>

          {/* Text Labels at the bottom */}
          <text 
            x="200" y="340" 
            textAnchor="middle" 
            className="fill-white font-black italic uppercase tracking-[0.2em] text-[24px]"
            style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))' }}
          >
            SATMOKO STUDIO
          </text>
          <text 
            x="200" y="370" 
            textAnchor="middle" 
            className="fill-cyan-400 font-bold uppercase tracking-[0.6em] text-[12px]"
          >
            AI CREATIVE
          </text>
        </svg>
      </motion.div>
    </div>
  );
};
