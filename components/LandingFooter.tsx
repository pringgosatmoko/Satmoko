import React from 'react';

export const LandingFooter: React.FC<{ lang: 'id' | 'en' }> = ({ lang }) => {
  return (
    <footer className="w-full py-8 mt-auto border-t border-white/5 opacity-40 text-center">
      <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] italic mb-3">
        {lang === 'id' ? "ORA NGAPAK ORA KEPENAK" : "STAY BOLD STAY CREATIVE"}
      </p>
      <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">
        © 2025 Satmoko Studio AI
      </p>
    </footer>
  );
};