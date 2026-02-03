
import React, { useState, useEffect, useMemo } from 'react';
import { RobotHero } from './components/RobotHero';
import { LoginForm } from './components/LoginForm';
import { ChatAssistant } from './components/ChatAssistant';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { StudioCreator } from './components/StudioCreator';
import { MemberControl } from './components/MemberControl';
import { DirectChat } from './components/DirectChat';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'text2vid' | 'txt2img' | 'studio' | 'members' | 'direct-chat';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [coreTemp, setCoreTemp] = useState(38.5);
  const [targetChatUser, setTargetChatUser] = useState<string | null>(null);

  const chime = useMemo(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'), []);

  const getEnv = (key: string) => {
    const vEnv = (import.meta as any).env || {};
    const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
    const wEnv = (window as any).process?.env || {};
    
    const fallbacks: Record<string, string> = {
      'VITE_DATABASE_URL': 'https://urokqoorxuiokizesiwa.supabase.co',
      'VITE_SUPABASE_ANON_KEY': 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8',
      'VITE_ADMIN_PASSWORD': 'admin7362',
      'VITE_ADMIN_EMAILS': 'pringgosatmoko@gmail.com'
    };

    return vEnv[key] || pEnv[key] || wEnv[key] || fallbacks[key] || "";
  };

  const aiKeyInfo = useMemo(() => {
    const keys = [
      { name: 'SYSTEM_LINK', val: process.env.API_KEY },
      { name: 'GEMINI_V3', val: getEnv('VITE_GEMINI_API_KEY_1') }
    ];
    const active = keys.find(k => k.val && k.val.length > 5);
    if (!active) return { name: 'VOID_LINK', mask: 'XXXX-XXXX', active: false };
    const v = active.val!;
    return { name: active.name, mask: `${v.substring(0, 4)}...${v.substring(v.length - 4)}`, active: true };
  }, [isLoggedIn]);

  const adminEmails = useMemo(() => getEnv('VITE_ADMIN_EMAILS').split(',').map((e: string) => e.trim().toLowerCase()), []);
  const isAdmin = useMemo(() => userEmail && adminEmails.includes(userEmail.toLowerCase()), [userEmail, adminEmails]);
  const supabaseUrl = getEnv('VITE_DATABASE_URL');
  const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

  const supabase = useMemo(() => {
    if (supabaseUrl && supabaseKey) return createClient(supabaseUrl, supabaseKey);
    return null;
  }, [supabaseUrl, supabaseKey]);

  useEffect(() => {
    // Fase 1: Robot Booting
    const timer1 = setTimeout(() => setIsLoaded(true), 500);
    // Fase 2: Tampilkan Login (Geser Robot ke atas)
    const timer2 = setTimeout(() => setShowLogin(true), 3200);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoreTemp(prev => {
        const change = (Math.random() - 0.5) * 0.5;
        const next = prev + change;
        return next < 36 ? 36.1 : next > 45 ? 44.9 : next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoggedIn && supabase) {
      const channel = supabase
        .channel('unread-messages-global-v2')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
          if (payload.new.receiver_email.toLowerCase() === userEmail.toLowerCase()) {
            setUnreadCount(prev => prev + 1);
            if (activeFeature !== 'direct-chat') chime.play().catch(() => {});
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isLoggedIn, supabase, userEmail, activeFeature]);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    setActiveFeature('menu');
  };

  const selectFeature = (feature: Feature) => {
    if (feature === 'members' && !isAdmin) return;
    if (feature === 'direct-chat') setUnreadCount(0);
    setActiveFeature(feature);
    setIsSidebarOpen(false);
  };

  const openDirectChatWith = (email: string) => {
    setTargetChatUser(email);
    setActiveFeature('direct-chat');
  };

  const renderFeature = () => {
    switch (activeFeature) {
      case 'menu': return <DashboardMenu onSelect={selectFeature} onChatUser={openDirectChatWith} unreadCount={unreadCount} isAdmin={isAdmin} userEmail={userEmail} adminEmail={adminEmails[0]} />;
      case 'chat': return <ChatAssistant onBack={() => setActiveFeature('menu')} />;
      case 'txt2img': return <ImageGenerator onBack={() => setActiveFeature('menu')} />;
      case 'img2vid': return <VideoGenerator mode="img2vid" onBack={() => setActiveFeature('menu')} />;
      case 'text2vid': return <VideoGenerator mode="text2vid" onBack={() => setActiveFeature('menu')} />;
      case 'studio': return <StudioCreator onBack={() => setActiveFeature('menu')} />;
      case 'direct-chat': return <DirectChat userEmail={userEmail} isAdmin={isAdmin} adminEmail={adminEmails[0]} initialTarget={targetChatUser} onBack={() => { setTargetChatUser(null); setActiveFeature('menu'); }} />;
      case 'members': return isAdmin ? <MemberControl onBack={() => setActiveFeature('menu')} onChatUser={openDirectChatWith} /> : <DashboardMenu onSelect={selectFeature} onChatUser={openDirectChatWith} unreadCount={unreadCount} isAdmin={isAdmin} userEmail={userEmail} adminEmail={adminEmails[0]} />;
      default: return <DashboardMenu onSelect={selectFeature} onChatUser={openDirectChatWith} unreadCount={unreadCount} isAdmin={isAdmin} userEmail={userEmail} adminEmail={adminEmails[0]} />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#010409] text-slate-100 overflow-x-hidden relative font-sans">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#010409]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 dark-studio-bg opacity-40"></div>
      </div>

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.main 
            key="login-scene" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} 
            className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 overflow-hidden"
          >
            <div className="w-full max-w-xl flex flex-col items-center">
              <RobotHero isLoaded={isLoaded} isCompact={showLogin} />
              
              <AnimatePresence>
                {showLogin && (
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} 
                    className="w-full mt-2"
                  >
                    <LoginForm onSuccess={handleLoginSuccess} />
                    <div className="mt-8 text-center">
                       <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 italic">©pringgo Satmoko Studio</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
            <div className="flex h-full relative">
              <AnimatePresence>
                {(isSidebarOpen || window.innerWidth >= 1024) && (
                  <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-white/5 flex flex-col py-8 lg:relative lg:translate-x-0 bg-slate-900/50 backdrop-blur-3xl`}>
                    <div className="px-7 mb-10 flex justify-between items-center">
                      <div onClick={() => selectFeature('menu')} className="cursor-pointer group">
                        <h1 className="text-2xl font-display font-black tracking-tighter text-white uppercase group-hover:text-cyan-400 transition-colors italic">SATMOKO</h1>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-cyan-500/80">STUDIO CREATIVE</p>
                      </div>
                      <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 p-2"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    
                    <nav className="flex-1 flex flex-col gap-1.5 px-4 overflow-y-auto custom-scrollbar">
                      <NavButton active={activeFeature === 'menu'} onClick={() => selectFeature('menu')} icon="fa-grid-horizontal" label="Dashboard" />
                      <NavButton active={activeFeature === 'chat'} onClick={() => selectFeature('chat')} icon="fa-brain-circuit" label="Asisten Satmoko bot" />
                      <NavButton active={activeFeature === 'txt2img'} onClick={() => selectFeature('txt2img')} icon="fa-wand-magic-sparkles" label="Image generator studio" />
                      <NavButton active={activeFeature === 'img2vid'} onClick={() => selectFeature('img2vid')} icon="fa-film" label="Video Image Generator" />
                      <NavButton active={activeFeature === 'studio'} onClick={() => selectFeature('studio')} icon="fa-bolt-lightning" label="Studio creator animasi" />
                      
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <NavButton active={activeFeature === 'direct-chat'} onClick={() => selectFeature('direct-chat')} icon="fa-comments" label="Send Message" badge={unreadCount > 0 ? unreadCount : undefined} />
                      </div>

                      {isAdmin && (
                        <div className="mt-8 pt-6 border-t border-white/5 space-y-1.5">
                          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">Security Hub</p>
                          <NavButton active={activeFeature === 'members'} onClick={() => selectFeature('members')} icon="fa-shield-halved" label="Records Control" />
                        </div>
                      )}
                    </nav>

                    <div className="px-4 mt-6">
                       <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${aiKeyInfo.active ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'bg-red-500'} animate-pulse`}></div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Link</span>
                             </div>
                             <span className="text-[7px] font-mono text-cyan-500/70">{aiKeyInfo.mask}</span>
                          </div>
                          <div className="space-y-1.5">
                             <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter">
                                <span className="text-slate-500">Core Temp</span>
                                <span className={`${coreTemp > 42 ? 'text-orange-500' : 'text-cyan-400'}`}>{coreTemp.toFixed(1)}°C</span>
                             </div>
                             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: `${(coreTemp / 60) * 100}%` }} className={`h-full ${coreTemp > 42 ? 'bg-orange-500' : 'bg-cyan-500'} transition-all`} />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="px-4 pt-6 mt-4 border-t border-white/5 space-y-4">
                      <button onClick={() => setIsLoggedIn(false)} className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-400 rounded-2xl transition-all flex items-center px-6 gap-3.5 border border-red-500/10 text-[9px] font-black uppercase tracking-[0.2em]">
                        <i className="fa-solid fa-power-off"></i>
                        <span>End Session</span>
                      </button>
                      <div className="text-center">
                         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-700 italic">©pringgo Satmoko</p>
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              <main className="flex-1 flex flex-col overflow-hidden relative">
                 <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-[#010409]/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-5">
                      <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 border border-white/5"><i className="fa-solid fa-bars-staggered"></i></button>
                      <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] hidden sm:block">COMMAND CONSOLE</h2>
                    </div>
                    <div className="w-11 h-11 rounded-2xl border border-white/10 p-0.5 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20">
                      <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-[10px] font-black text-white uppercase italic">{userEmail.charAt(0)}</div>
                    </div>
                 </header>
                 <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
                    <div className="max-w-7xl mx-auto h-full">
                      <AnimatePresence mode="wait">
                        <motion.div key={activeFeature} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="h-full">
                          {renderFeature()}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                 </div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardMenu: React.FC<{ onSelect: (f: Feature) => void; onChatUser: (e: string) => void; unreadCount: number; isAdmin: boolean; userEmail: string; adminEmail: string }> = ({ onSelect, onChatUser, unreadCount, isAdmin, userEmail, adminEmail }) => (
  <div className="space-y-20 pb-40">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
       <div className="space-y-4">
          <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.6em]">Welcome,</p>
          <h2 className="text-5xl md:text-6xl font-display font-black tracking-tighter uppercase italic text-gradient leading-none">{isAdmin ? 'Admin Satmoko' : userEmail.split('@')[0]}</h2>
       </div>
       {!isAdmin && (
         <button onClick={() => onChatUser(adminEmail)} className="px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black uppercase text-[10px] tracking-widest hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-3 active:scale-95 shadow-xl group">
           <i className="fa-solid fa-headset group-hover:rotate-12 transition-transform"></i>
           Support Admin
         </button>
       )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MenuCard icon="fa-brain-circuit" color="cyan" title="Asisten Bot" desc="High-level creative reasoning." onClick={() => onSelect('chat')} />
      <MenuCard icon="fa-wand-magic-sparkles" color="fuchsia" title="Image generator studio" desc="Visual synthesis engine." onClick={() => onSelect('txt2img')} />
      <MenuCard icon="fa-film" color="blue" title="Video Image" desc="Veo Cinematic rendering." onClick={() => onSelect('img2vid')} />
      <MenuCard icon="fa-comments" color="cyan" title="Send Message" desc="P2P Messaging Terminal." onClick={() => onSelect('direct-chat')} badge={unreadCount} />
    </div>
  </div>
);

const MenuCard: React.FC<{ icon: string; color: string; title: string; desc: string; onClick: () => void; badge?: number }> = ({ icon, color, title, desc, onClick, badge }) => (
  <button onClick={onClick} className="group glass-panel p-10 rounded-[2.5rem] text-left hover:border-white/20 transition-all active:scale-[0.98] bg-slate-900/40 flex flex-col justify-between shadow-2xl relative overflow-hidden">
    <div className={`absolute -top-20 -right-20 w-40 h-40 bg-${color}-500/10 blur-[80px] rounded-full`}></div>
    {badge ? <div className="absolute top-6 right-6 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white animate-bounce shadow-lg">{badge}</div> : null}
    <div>
      <div className={`w-14 h-14 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400 mb-8 group-hover:scale-110 transition-transform`}><i className={`fa-solid ${icon}`}></i></div>
      <h3 className="text-xl font-display font-black text-white mb-2 uppercase tracking-tighter italic">{title}</h3>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{desc}</p>
    </div>
  </button>
);

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; badge?: number }> = ({ active, onClick, icon, label, badge }) => (
  <button onClick={onClick} className={`w-full py-4 rounded-2xl transition-all flex items-center px-6 gap-4 border relative ${active ? 'bg-cyan-500/10 text-white border-cyan-500/20' : 'text-slate-500 hover:text-slate-200 border-transparent hover:bg-white/[0.04]'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-cyan-400' : 'text-slate-700'} text-sm w-6 text-center`}></i>
    <span className="text-[11px] font-black uppercase tracking-[0.3em] italic flex-1 text-left">{label}</span>
    {badge && <span className="bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">{badge}</span>}
  </button>
);

export default App;
