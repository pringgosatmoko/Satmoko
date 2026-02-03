
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogoHero } from './components/LogoHero';
import { LoginForm } from './components/LoginForm';
import { ChatAssistant } from './components/ChatAssistant';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { StudioCreator } from './components/StudioCreator';
import { StoryboardToVideo } from './components/StoryboardToVideo';
import { VoiceCloning } from './components/VoiceCloning';
import { MemberControl } from './components/MemberControl';
import { SystemLogs } from './components/SystemLogs';
import { DirectChat } from './components/DirectChat';
import { ProfileSettings } from './components/ProfileSettings';
import { StartAnimation } from './components/StartAnimation';
import { SloganAnimation } from './components/SloganAnimation';
import { LandingHero } from './components/LandingHero';
import { StorageManager } from './components/StorageManager';
import { PriceManager } from './components/PriceManager';
import { ProductSlider } from './components/ProductSlider';
import { VideoDirector } from './components/VideoDirector';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { TopupCenter } from './components/TopupCenter';
import { LandingFooter } from './components/LandingFooter';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, updatePresence, supabase, sendTelegramNotification } from './lib/api';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'txt2img' | 'studio' | 'storyboard-to-video' | 'voice-cloning' | 'members' | 'logs' | 'direct-chat' | 'profile' | 'storage' | 'price-center' | 'video-director' | 'aspect-ratio' | 'topup';
export type Lang = 'id' | 'en';

const SideIcon = ({ active, icon, onClick, tooltip }: { active: boolean, icon: string, onClick: () => void, tooltip: string }) => (
  <button 
    onClick={onClick} 
    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group ${active ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
  >
    <i className={`fa-solid ${icon} text-lg`}></i>
    <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/90 border border-white/10 text-[9px] font-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[300] uppercase tracking-widest">
      {tooltip}
    </div>
  </button>
);

const MenuCard = ({ icon, title, desc, onClick, color, small }: any) => {
  const neonStyles: any = {
    cyan: 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)] text-cyan-400',
    fuchsia: 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)] text-fuchsia-400',
    emerald: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-400',
    blue: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-blue-400',
    yellow: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] text-yellow-400',
    purple: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-purple-400',
    slate: 'border-slate-500 shadow-[0_0_15px_rgba(100,116,139,0.3)] text-slate-400',
    red: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] text-red-500',
    orange: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-orange-400'
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.05, y: -4 }} 
      whileTap={{ scale: 0.95 }} 
      onClick={onClick} 
      className={`relative glass-panel rounded-[2rem] border-2 p-3 lg:p-5 transition-all bg-black/60 flex flex-col items-center text-center gap-2 ${neonStyles[color] || neonStyles.cyan}`}
    >
      <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-xl lg:text-3xl mb-1 bg-black/30 border border-white/5`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div className="space-y-0.5">
        <h3 className="text-[10px] lg:text-[12px] font-black uppercase text-white tracking-widest leading-tight">{title}</h3>
        {!small && <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter opacity-60 line-clamp-1">{desc}</p>}
      </div>
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${color === 'cyan' ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : color === 'orange' ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-white/40'}`}></div>
    </motion.button>
  );
};

const DashboardMenu = ({ onSelect, isAdmin, t, userEmail, credits }: { onSelect: (f: Feature) => void, isAdmin: boolean, t: any, userEmail: string, credits: number }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 py-4 lg:py-8">
      <div className="flex items-center justify-between px-2 lg:px-0">
        <div className="flex flex-col">
          <h1 className="text-xl lg:text-3xl font-black italic uppercase text-white tracking-tighter">Command <span className="text-cyan-400">Hub</span></h1>
          <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1">{t.subtitle}</p>
        </div>
        <button 
          onClick={() => onSelect('topup')}
          className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 lg:p-3 pr-4 lg:pr-6 rounded-2xl hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group"
        >
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-wallet"></i>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">{t.credits}</p>
            <p className="text-sm lg:text-lg font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
        <MenuCard icon="fa-clapperboard" title={t.videoDirector} desc="Movie Production" onClick={() => onSelect('video-director')} color="orange" />
        <MenuCard icon="fa-comment-dots" title={t.aiAssistant} desc="Neural Brain AI" onClick={() => onSelect('chat')} color="cyan" />
        <MenuCard icon="fa-image" title={t.visualArt} desc="8K Visual Artist" onClick={() => onSelect('txt2img')} color="fuchsia" />
        <MenuCard icon="fa-vector-square" title={t.aspectRatio} desc="Smart Reframe" onClick={() => onSelect('aspect-ratio')} color="emerald" />
        <MenuCard icon="fa-video" title={t.video} desc="Cinematic Clips" onClick={() => onSelect('img2vid')} color="cyan" />
        <MenuCard icon="fa-microphone-lines" title={t.voice} desc="High-End Voice Clone" onClick={() => onSelect('voice-cloning')} color="blue" />
        <MenuCard icon="fa-film" title={t.studio} desc="Ad Production Suite" onClick={() => onSelect('studio')} color="yellow" />
        <MenuCard icon="fa-film-list" title={t.storyboardToVid} desc="Script to Sequence" onClick={() => onSelect('storyboard-to-video')} color="purple" />
        <MenuCard icon="fa-envelope" title={t.inbox} desc="P2P Data Channel" onClick={() => onSelect('direct-chat')} color="slate" />
      </div>

      {isAdmin && (
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="flex items-center gap-6 justify-center">
            <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.5em]">{t.adminSection}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
            <MenuCard icon="fa-user-gear" title={t.members} onClick={() => onSelect('members')} color="red" small />
            <MenuCard icon="fa-server" title={t.logs} onClick={() => onSelect('logs')} color="red" small />
            <MenuCard icon="fa-database" title={t.storage} onClick={() => onSelect('storage')} color="red" small />
            <MenuCard icon="fa-tags" title={t.priceCenter} onClick={() => onSelect('price-center')} color="red" small />
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userCredits, setUserCredits] = useState(0);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<Feature>('menu');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('id');

  const isAdmin = useMemo(() => {
    if (!userEmail) return false;
    return checkAdmin(userEmail.toLowerCase());
  }, [userEmail]);

  const adminEmail = "rlirp3fop@mozmail.com";

  const refreshUserData = useCallback(async () => {
    if (userEmail) {
      if (checkAdmin(userEmail)) {
        setUserCredits(999999);
        setExpiryDate(null);
        return;
      }

      const { data } = await supabase
        .from('members')
        .select('credits, valid_until')
        .eq('email', userEmail.toLowerCase())
        .single();
      
      if (data) {
        setUserCredits(data.credits || 0);
        setExpiryDate(data.valid_until || null);
      }
    }
  }, [userEmail]);

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      const normalizedEmail = userEmail.toLowerCase();
      updatePresence(normalizedEmail);
      refreshUserData();
      const heartbeat = setInterval(() => {
        updatePresence(normalizedEmail);
        refreshUserData();
      }, 10000);
      return () => clearInterval(heartbeat);
    }
  }, [isLoggedIn, userEmail, refreshUserData]);

  const handleLoginSuccess = (email: string, expiry?: string | null) => {
    setUserEmail(email);
    setExpiryDate(expiry || null);
    setIsLoggedIn(true);
    sendTelegramNotification(`👤 *User Login*\nEmail: ${email}\nStatus: ${checkAdmin(email) ? 'ADMIN' : 'MEMBER'}`);
  };

  const translations = {
    id: {
      home: "Beranda",
      aiAssistant: "Tanya AI",
      visualArt: "Buat Gambar",
      aspectRatio: "Ubah Rasio",
      voice: "Kloning Suara",
      video: "Bikin Video",
      studio: "Studio Iklan",
      storyboardToVid: "Papan Cerita",
      videoDirector: "Video Director",
      inbox: "Chat Pribadi",
      members: "Kelola Member",
      logs: "Cek Sistem",
      storage: "Pusat Data",
      priceCenter: "Atur Harga",
      logout: "Keluar",
      status: "SISTEM_AKTIF",
      title: "SATMOKO STUDIO CREATIVE",
      subtitle: "PUSAT KREASI KECERDASAN BUATAN",
      credits: "SALDO_KREDIT",
      adminSection: "AKSES_ADMIN_SISTEM",
      switchLang: "Bahasa",
      topup: "Isi Saldo",
      navFitur: "FITUR",
      navHarga: "HARGA",
      navKontak: "KONTAK"
    },
    en: {
      home: "Dashboard",
      aiAssistant: "AI Chat",
      visualArt: "Create Image",
      aspectRatio: "Change Ratio",
      voice: "Voice Clone",
      video: "Create Video",
      studio: "Ad Studio",
      storyboardToVid: "Storyboard",
      videoDirector: "Video Director",
      inbox: "Direct Message",
      members: "Manage Users",
      logs: "System Status",
      storage: "Data Center",
      priceCenter: "Price Settings",
      logout: "Sign Out",
      status: "SYSTEM_ONLINE",
      title: "SATMOKO STUDIO CREATIVE",
      subtitle: "AI CREATIVE COMMAND CENTER",
      credits: "CREDIT_BALANCE",
      adminSection: "ADMIN_ACCESS_ONLY",
      switchLang: "Locale",
      topup: "Topup Balance",
      navFitur: "FEATURES",
      navHarga: "PRICING",
      navKontak: "CONTACT"
    }
  };

  const t = translations[lang];

  const renderFeature = () => {
    const props = { 
      onBack: () => setActiveFeature('menu'), 
      lang, 
      userEmail, 
      credits: userCredits, 
      validUntil: expiryDate,
      refreshCredits: refreshUserData 
    };
    switch (activeFeature) {
      case 'chat': return <ChatAssistant {...props} />;
      case 'img2vid': return <VideoGenerator mode="img2vid" {...props} />;
      case 'txt2img': return <ImageGenerator {...props} />;
      case 'aspect-ratio': return <AspectRatioEditor {...props} />;
      case 'studio': return <StudioCreator {...props} />;
      case 'storyboard-to-video': return <StoryboardToVideo {...props} />;
      case 'voice-cloning': return <VoiceCloning {...props} />;
      case 'video-director': return <VideoDirector {...props} />;
      case 'members': return <MemberControl {...props} />;
      case 'logs': return <SystemLogs {...props} />;
      case 'storage': return <StorageManager {...props} />;
      case 'price-center': return <PriceManager {...props} />;
      case 'direct-chat': return <DirectChat isAdmin={isAdmin} adminEmail={adminEmail} {...props} />;
      case 'profile': return <ProfileSettings {...props} />;
      case 'topup': return <TopupCenter {...props} />;
      default: return <DashboardMenu onSelect={setActiveFeature} isAdmin={isAdmin} t={t} userEmail={userEmail} credits={userCredits} />;
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen w-full bg-[#010409] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="h-full w-full relative overflow-y-auto custom-scrollbar bg-[#010409]"
          >
            {/* Landing Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-[250] h-20 px-6 flex items-center justify-between glass-panel border-b border-white/5 bg-black/40">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-black text-xs">S</div>
                 <span className="text-[11px] font-black uppercase tracking-widest hidden md:block">SATMOKO <span className="text-cyan-400">STUDIO</span></span>
              </div>
              <div className="flex items-center gap-8">
                 <button onClick={() => scrollTo('features')} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">{t.navFitur}</button>
                 <button onClick={() => scrollTo('pricing')} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">{t.navHarga}</button>
                 <button onClick={() => scrollTo('contact')} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">{t.navKontak}</button>
                 <div className="flex gap-2 ml-4">
                    <button onClick={() => setLang('id')} className={`w-8 h-8 rounded-lg text-[9px] font-black border transition-all ${lang === 'id' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'text-slate-500 border-white/5'}`}>ID</button>
                    <button onClick={() => setLang('en')} className={`w-8 h-8 rounded-lg text-[9px] font-black border transition-all ${lang === 'en' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'text-slate-500 border-white/5'}`}>EN</button>
                 </div>
              </div>
            </nav>

            <div className="fixed inset-0 z-0 pointer-events-none">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.08)_0%,transparent_60%)]"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-center pt-32 pb-10 px-6 min-h-full">
              <div className="w-full max-w-[500px] flex flex-col items-center">
                <LandingHero />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="mb-4 w-full"
                >
                  <LogoHero isLoaded={true} />
                </motion.div>
                <div className="mb-8 w-full flex flex-col items-center">
                   <SloganAnimation />
                </div>
                
                <div id="features" className="w-full scroll-mt-24">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="w-full"
                  >
                    <ProductSlider lang={lang} />
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  className="w-full relative z-20 pb-20"
                >
                  <LoginForm onSuccess={handleLoginSuccess} lang={lang} />
                </motion.div>

                <div id="contact" className="w-full mt-20 scroll-mt-24">
                   <LandingFooter lang={lang} />
                </div>
                
                <div className="mt-12 text-center opacity-20 text-[7px] font-black uppercase tracking-[0.5em] text-cyan-500">
                  PROTECTED_BY_SATMOKO_CREATIVE • 2025
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen overflow-hidden bg-[#02060c]">
             <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm lg:hidden"
                  />
                )}
             </AnimatePresence>

             <aside className={`fixed lg:relative inset-y-0 left-0 z-[200] w-[80px] bg-[#0d1117]/95 backdrop-blur-3xl border-r border-white/5 transition-transform duration-300 lg:translate-x-0 flex flex-col items-center py-8 gap-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all mb-4"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>

                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-black shadow-lg shadow-cyan-500/20 active:scale-90 transition-transform cursor-pointer mb-4" onClick={() => { setActiveFeature('menu'); setIsSidebarOpen(false); }}>
                    <i className="fa-solid fa-cube text-lg"></i>
                </div>

                <nav className="flex-1 flex flex-col gap-4">
                  <SideIcon active={activeFeature === 'menu'} icon="fa-house" onClick={() => { setActiveFeature('menu'); setIsSidebarOpen(false); }} tooltip={t.home} />
                  <SideIcon active={activeFeature === 'video-director'} icon="fa-clapperboard" onClick={() => { setActiveFeature('video-director'); setIsSidebarOpen(false); }} tooltip={t.videoDirector} />
                  <SideIcon active={activeFeature === 'chat'} icon="fa-comment-dots" onClick={() => { setActiveFeature('chat'); setIsSidebarOpen(false); }} tooltip={t.aiAssistant} />
                  <SideIcon active={activeFeature === 'txt2img'} icon="fa-image" onClick={() => { setActiveFeature('txt2img'); setIsSidebarOpen(false); }} tooltip={t.visualArt} />
                  <SideIcon active={activeFeature === 'aspect-ratio'} icon="fa-vector-square" onClick={() => { setActiveFeature('aspect-ratio'); setIsSidebarOpen(false); }} tooltip={t.aspectRatio} />
                  <SideIcon active={activeFeature === 'voice-cloning'} icon="fa-microphone-lines" onClick={() => { setActiveFeature('voice-cloning'); setIsSidebarOpen(false); }} tooltip={t.voice} />
                  <SideIcon active={activeFeature === 'img2vid'} icon="fa-video" onClick={() => { setActiveFeature('img2vid'); setIsSidebarOpen(false); }} tooltip={t.video} />
                  <SideIcon active={activeFeature === 'storyboard-to-video'} icon="fa-film-list" onClick={() => { setActiveFeature('storyboard-to-video'); setIsSidebarOpen(false); }} tooltip={t.storyboardToVid} />
                  <SideIcon active={activeFeature === 'studio'} icon="fa-film" onClick={() => { setActiveFeature('studio'); setIsSidebarOpen(false); }} tooltip={t.studio} />
                  <SideIcon active={activeFeature === 'topup'} icon="fa-wallet" onClick={() => { setActiveFeature('topup'); setIsSidebarOpen(false); }} tooltip={t.topup} />
                </nav>

                <div className="flex flex-col gap-5 items-center mt-auto">
                  <button onClick={() => { setActiveFeature('profile'); setIsSidebarOpen(false); }} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${activeFeature === 'profile' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}>
                    <i className="fa-solid fa-user-shield text-xs"></i>
                  </button>
                  <button onClick={() => window.location.reload()} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                    <i className="fa-solid fa-power-off text-xs"></i>
                  </button>
                </div>
             </aside>

             <main className="flex-1 overflow-y-auto no-scrollbar relative bg-[#010409]">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-6 right-6 z-[160] w-12 h-12 rounded-2xl bg-cyan-500 text-black flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <i className="fa-solid fa-bars-staggered"></i>
                </button>

                <div className="max-w-[1400px] mx-auto px-6 py-6 lg:py-10">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeFeature} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      {renderFeature()}
                    </motion.div>
                  </AnimatePresence>
                </div>
             </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
