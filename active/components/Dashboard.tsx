import React, { useState, useEffect } from 'react';
import { getUserCredits, isAdmin } from '../lib/api';

export const Dashboard: React.FC<{ userEmail: string; onLogout: () => void }> = ({ userEmail, onLogout }) => {
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    getUserCredits(userEmail).then(setCredits);
  }, [userEmail]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 glass border-r border-white/5 p-6 flex flex-col">
        <div className="mb-10">
          <h2 className="text-xl font-black text-white italic">SATMOKO <span className="text-cyan-400">AI</span></h2>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon="fa-house" label="Overview" active />
          <NavItem icon="fa-brain" label="Smart Chat" />
          <NavItem icon="fa-video" label="Video Studio" />
          <NavItem icon="fa-image" label="Visual Art" />
          <NavItem icon="fa-microphone" label="Voice Cloning" />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-white/5 mb-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase">Credits Balance</p>
             <p className="text-xl font-black text-cyan-400">{isAdmin(userEmail) ? '∞' : credits.toLocaleString()}</p>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all">
            DISCONNECT SESSION
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
           <div>
             <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Command Center</h1>
             <p className="text-slate-500 text-xs font-bold">Logged in as {userEmail}</p>
           </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           <FeatureCard title="Production Studio" desc="Generate cinematic clips with Veo 3.1" icon="fa-clapperboard" color="cyan" />
           <FeatureCard title="Neural Logic" desc="Advanced reasoning with Gemini 3 Pro" icon="fa-microchip" color="purple" />
           <FeatureCard title="Voice Engine" desc="Precision human voice cloning" icon="fa-lines-leaning" color="emerald" />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: any) => (
  <button className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${active ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
    <i className={`fa-solid ${icon}`}></i>
    {label}
  </button>
);

const FeatureCard = ({ title, desc, icon, color }: any) => (
  <div className="p-8 glass rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
      <i className={`fa-solid ${icon} text-xl`}></i>
    </div>
    <h3 className="text-lg font-black text-white mb-2">{title}</h3>
    <p className="text-slate-500 text-xs font-bold leading-relaxed">{desc}</p>
  </div>
);