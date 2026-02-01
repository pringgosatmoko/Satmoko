
import React from 'react';
import { motion } from 'framer-motion';
import { isAdmin as checkAdmin } from '../lib/api';

interface HomeViewProps {
  userEmail: string;
  userFullName?: string;
  credits: number;
  isPro: boolean;
  onAction: (act: string) => void;
  onLogout: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ userEmail, userFullName, credits, isPro, onAction, onLogout }) => {
  const isAdmin = checkAdmin(userEmail);
  const displayName = userFullName || userEmail.split('@')[0].toUpperCase();
  
  const tools = [
    { id: 'txt2img', icon: 'fa-image', label: 'AI Images', color: 'bg-blue-500/10 text-blue-400' },
    { id: 'img2vid', icon: 'fa-video', label: 'AI Videos', color: 'bg-purple-500/10 text-purple-400' },
    { id: 'edit', icon: 'fa-wand-magic-sparkles', label: 'AI Edit', color: 'bg-pink-500/10 text-pink-400' },
    { id: 'topup', icon: 'fa-coins', label: 'Top Up', color: 'bg-yellow-500/10 text-yellow-500' },
  ];

  return (
    <div className="flex flex-col gap-8 pt-8 px-6">
      {/* Top Header - Identity Integrated */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-gradient rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
            <i className="fa-solid fa-bolt-lightning text-white text-lg"></i>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight italic text-white uppercase leading-none">SatmokoArt</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-yellow-500 shadow-[0_0_5px_yellow]' : 'bg-cyan-500 shadow-[0_0_5px_cyan]'}`}></span>
               <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">{isAdmin ? 'ADMIN NODE' : 'MEMBER NODE'}</p>
            </div>
          </div>
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
             <p className="text-[9px] font-black text-white uppercase">{displayName}</p>
             <p className="text-[7px] font-bold text-slate-600 lowercase">{userEmail}</p>
          </div>
          <div className="bg-slate-900/50 px-3 py-2 rounded-2xl border border-white/5 flex items-center gap-3 shadow-inner">
            <div className="flex items-center gap-1.5">
               <i className="fa-solid fa-star text-yellow-500 text-[10px]"></i>
               <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
                 {isAdmin ? '∞' : credits.toLocaleString()}
               </span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-10 h-10 glass-imagine rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 active:scale-90 transition-all hover:bg-red-500/10 shadow-lg"
            title="Keluar Sesi"
          >
            <i className="fa-solid fa-power-off text-sm"></i>
          </button>
        </div>
      </header>

      {/* User Greeting Mobile */}
      <div className="md:hidden flex flex-col px-1 -mt-4">
          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] mb-1">Authenticated As:</p>
          <div className="flex items-baseline gap-2">
             <p className="text-sm font-black italic text-white uppercase tracking-tighter">{displayName}</p>
             <p className="text-[8px] font-bold text-slate-600 lowercase tracking-widest">{userEmail}</p>
          </div>
      </div>

      {/* Featured Banner - Sora Style */}
      <section>
        <div className="relative h-56 rounded-imagine-lg overflow-hidden bg-slate-900 group shadow-2xl border border-white/5">
          <img 
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
            alt="Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-2">
               <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <p className="text-[8px] font-black text-purple-400 uppercase tracking-[0.2em]">Sora Neural v2.5</p>
               </div>
            </div>
            <h2 className="text-4xl font-black italic leading-none mb-4 uppercase text-white shadow-xl">CINEMATIC <br/><span className="text-purple-400">VISION</span></h2>
            <button onClick={() => onAction('img2vid')} className="w-fit px-8 py-3 bg-white text-black text-[10px] font-black uppercase rounded-full shadow-2xl active:scale-95 transition-all hover:bg-cyan-400">Generate Now</button>
          </div>
        </div>
      </section>

      {/* Quick Tools Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">AI Creative Studio</h3>
          <button className="text-[9px] font-bold text-slate-600 uppercase">See All</button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {tools.map((tool) => (
            <button key={tool.id} onClick={() => onAction(tool.id)} className="flex flex-col items-center gap-3 group">
              <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-2xl transition-all group-active:scale-90 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${tool.color} group-hover:border-white/20`}>
                <i className={`fa-solid ${tool.icon}`}></i>
              </div>
              <span className="text-[8px] font-black text-slate-500 uppercase text-center tracking-tight opacity-70 group-hover:opacity-100">{tool.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Topup Promotion Card */}
      <section className="mt-4">
        <motion.div 
          whileTap={{ scale: 0.98 }}
          onClick={() => onAction('topup')}
          className="p-6 rounded-[2.5rem] bg-gradient-to-r from-cyan-600 to-blue-700 flex items-center justify-between shadow-xl cursor-pointer border border-white/10"
        >
          <div className="space-y-1">
             <h4 className="text-xs font-black uppercase text-white italic tracking-widest">KEHABISAN KREDIT?</h4>
             <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Top Up sekarang & lanjut berkreasi!</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-cyan-600 shadow-lg active:scale-90">
             <i className="fa-solid fa-plus text-xl"></i>
          </div>
        </motion.div>
      </section>

      {/* Trending Section */}
      <section className="space-y-5 pb-20">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Community Trends</h3>
          <div className="flex gap-2">
             <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-600"><i className="fa-solid fa-grip"></i></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="aspect-[3/4] rounded-imagine-lg overflow-hidden relative glass-imagine shadow-2xl border border-white/5"
            >
              <img 
                src={`https://picsum.photos/400/600?random=${i + 150}`} 
                className="w-full h-full object-cover opacity-90 grayscale hover:grayscale-0 transition-all duration-700"
                alt="Trending"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                   </div>
                   <p className="text-[8px] font-bold text-white uppercase tracking-widest opacity-60 truncate">Node_Creator_{i}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
