
import React from 'react';

export const LandingHero: React.FC = () => {
  return (
    <div className="relative w-full max-w-[240px] md:max-w-[320px] aspect-square flex items-center justify-center select-none overflow-visible">
      {/* Background Glow Statis */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-purple-500/5 blur-[60px]"></div>

      {/* RINGS - Statis */}
      <div className="absolute w-[100%] h-[100%] rounded-full border-[0.5px] border-cyan-400/10" />
      <div className="absolute w-[95%] h-[95%] rounded-full border-[1px] border-dashed border-cyan-500/10" />
      <div className="absolute w-[90%] h-[90%] rounded-full border-2 border-transparent border-t-cyan-400/20 border-b-purple-500/20" />

      {/* THE LOGO CONTAINER - Statis */}
      <div className="relative w-[75%] h-[75%] flex items-center justify-center">
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
          <defs>
            <linearGradient id="silver-grad-pro" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#64748b', stopOpacity: 1 }} />
            </linearGradient>
          </defs>

          {/* S - CIRCUIT SIDE */}
          <g transform="translate(40, 60) scale(1.1)">
             <path 
                d="M140 60 C80 60, 60 120, 100 160 S160 220, 100 260 S20 200, 20 200" 
                fill="none" 
                stroke="url(#silver-grad-pro)" 
                strokeWidth="24" 
                strokeLinecap="round"
             />
             <circle cx="140" cy="60" r="6" fill="#22d3ee" />
             <circle cx="20" cy="200" r="6" fill="#22d3ee" />
          </g>

          {/* A - LENS SIDE */}
          <g transform="translate(180, 80) scale(1.1)">
             <path 
                d="M20 200 L80 40 L140 200" 
                fill="none" 
                stroke="url(#silver-grad-pro)" 
                strokeWidth="24" 
                strokeLinecap="round"
             />
             <rect x="62" y="10" width="40" height="15" rx="4" fill="url(#silver-grad-pro)" />
             <g transform="translate(80, 140)">
                <circle r="42" fill="#020617" stroke="url(#silver-grad-pro)" strokeWidth="4" />
                <circle r="15" fill="#22d3ee" opacity="0.4" />
             </g>
          </g>
        </svg>
      </div>

      {/* HUD Lines - Statis */}
      <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 h-24 w-[1px] bg-cyan-500/20"></div>
      <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-24 w-[1px] bg-purple-500/20"></div>
    </div>
  );
};
