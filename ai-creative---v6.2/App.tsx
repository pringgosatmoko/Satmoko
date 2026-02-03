
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogoHero } from './components/LogoHero';
import { LoginForm } from './components/LoginForm';
import { ChatAssistant } from './components/ChatAssistant';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { StudioCreator } from './components/StudioCreator';
import { VoiceCloning } from './components/VoiceCloning';
import { MemberControl } from './components/MemberControl';
import { SystemLogs } from './components/SystemLogs';
import { DirectChat } from './components/DirectChat';
import { ProfileSettings } from './components/ProfileSettings';
import { StartAnimation } from './components/StartAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { isAdmin as checkAdmin, updatePresence, supabase, sendTelegramNotification, fetchMasterKeyFromDb } from './lib/api';

export type Feature = 'menu' | 'chat' | 'img2vid' | 'txt2img' | 'studio' | 'voice-cloning' | 'members' | 'logs' | 'direct-chat' | 'profile';
export type Lang = 'id' | 'en';

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

  const adminEmail = "pringgosatmoko@gmail.com";

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

  // Injeksi Kunci AI dari Database
  const initializeAiSystem = useCallback(async () => {
    const masterKey = await fetchMasterKeyFromDb();
    if (masterKey) {
      const win = window as any;
      win.process = win.process || { env: {} };
      win.process.env.API_KEY = masterKey;
      console.log("SATMOKO_HUB: Neural Sync Successful via Database.");
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      const normalizedEmail = userEmail.toLowerCase();
      updatePresence(normalizedEmail);
      refreshUserData();
      initializeAiSystem(); // Tarik kunci saat login
      
      const heartbeat = setInterval(() => {
        updatePresence(normalizedEmail);
        refreshUserData();
      }, 10000);
      return () => clearInterval(heartbeat);
    }
  }, [isLoggedIn, userEmail, refreshUserData, initializeAiSystem]);

  const handleLoginSuccess = (email: string, expiry?: string | null) => {
    setUserEmail(email);
    setExpiryDate(expiry || null);
    setIsLoggedIn(true);
    sendTelegramNotification(`👤 *User Login*\nEmail: ${email}\nStatus: ${checkAdmin(email) ? 'ADMIN' : 'MEMBER'}`);
  };

  const translations = {
    id: {
      home: "Beranda", aiAssistant: "Tanya AI", visualArt: "Buat Gambar", voice: "Suara AI",
      video: "Buat Video", studio: "Bikin Iklan", inbox: "Pesan Chat", members: "Atur Member",
      logs: "Cek Sistem", logout: "Keluar", status: "Status: Aktif", title: "Pusat Kendali",
      subtitle: "Selamat Datang di Satmoko Hub", credits: "Kredit Anda", adminSection: "Area Admin",
      switchLang: "Ganti Bahasa"
    },
    en: {
      home: "Dashboard Home", aiAssistant: "AI Assistant", visualArt: "Digital Imagery",
      voice: "Vocal Synthesis", video: "Cinematic Video", studio: "Production Suite",
      inbox: "Communication", members: "Membership", logs: "Diagnostics",
      logout: "Terminate Session", status: "Status: Active", title: "Central Interface",
      subtitle: "Satmoko Studio Professional Hub", credits: "Your Balance", adminSection: "Administrative Division",
      switchLang: "Language Preference"
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
      case 'studio': return <StudioCreator {...props} />;
      case 'voice-cloning': return <VoiceCloning {...props} />;
      case 'members': return <MemberControl {...props} />;
      case 'logs': return <SystemLogs {...props} />;
      case 'direct-chat': return <DirectChat isAdmin={isAdmin} adminEmail={adminEmail} {...props} />;
      case 'profile': return <ProfileSettings {...props} />;
      default: return <DashboardMenu onSelect={setActiveFeature} isAdmin={isAdmin} t={t} lang={lang} setLang={setLang} credits={userCredits} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#010409] text-slate-100 font-sans selection:bg-cyan-500/30">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <StartAnimation key="intro" onComplete={() => setShowIntro(false)} />
        ) : !isLoggedIn ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative min-h-screen flex flex-col items-center justify-center bg-[#010409] overflow-hidden px-6 py-20">
            <div className="fixed top-8 right-8 z-[200] flex gap-2">
               <button onClick={() => setLang('id')} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${lang === 'id' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-black/40 backdrop-blur-md text-slate-500 border-white/5 hover:border-white/20'}`}>ID</button>
               <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${lang === 'en' ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-black/40 backdrop-blur-md text-slate-500 border-white/5 hover:border-white/20'}`}>EN</button>
            </div>

            <div className="absolute inset-0 z-0">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1)_0%,transparent_70%)]"></div>
               <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0, y: 50 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                transition={{ type: "spring", damping: 12, stiffness: 100 }}
                className="relative mb-8"
              >
                <div className="w-32 h-32 rounded-full flex items-center justify-center border-2 border-cyan-400/20 bg-black/40 backdrop-blur-2xl shadow-[0_0_80px_rgba(34,211,238,0.15)] relative">
                  <div className="absolute inset-0 rounded-full border border-cyan-400/5 animate-[ping_3s_infinite]"></div>
                  <i className="fa-solid fa-brain text-cyan-400 text-4xl"></i>
                </div>
              </motion.div>
              
              <LogoHero isLoaded={true} />
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 mb-10 text-center"
              >
                <p className="text-[10px] font-black uppercase italic text-cyan-500/60 tracking-[0.5em] drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  Ora Ngapak Ora Kepenak
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="w-full"
              >
                <LoginForm onSuccess={handleLoginSuccess} lang={lang} />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-screen overflow-hidden">
             <aside className={`fixed inset-y-0 left-0 z-[200] w-[280px] bg-[#0d1117] border-r border-white/5 transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-8 px-2">
                  <div>
                    <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">SATMOKO</h1>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mt-1">AI CREATIVE</p>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>

                <div className="mb-8 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                   <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-1">{t.credits}</p>
                   <p className="text-xl font-black italic text-white tracking-tighter">
                    {isAdmin ? '∞' : userCredits.toLocaleString()} 
                    <span className="text-[10px] text-slate-500 not-italic uppercase ml-1">CR</span>
                   </p>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  <SidebarLink active={activeFeature === 'menu'} icon="fa-house" label={t.home} onClick={() => { setActiveFeature('menu'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'chat'} icon="fa-comment-dots" label={t.aiAssistant} onClick={() => { setActiveFeature('chat'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'txt2img'} icon="fa-image" label={t.visualArt} onClick={() => { setActiveFeature('txt2img'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'voice-cloning'} icon="fa-microphone-lines" label={t.voice} onClick={() => { setActiveFeature('voice-cloning'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'img2vid'} icon="fa-video" label={t.video} onClick={() => { setActiveFeature('img2vid'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'studio'} icon="fa-film" label={t.studio} onClick={() => { setActiveFeature('studio'); setIsSidebarOpen(false); }} />
                  <SidebarLink active={activeFeature === 'direct-chat'} icon="fa-inbox" label={t.inbox} onClick={() => { setActiveFeature('direct-chat'); setIsSidebarOpen(false); }} />
                  {isAdmin && (
                    <>
                      <div className="pt-6 pb-2"><p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 px-4">{t.adminSection}</p></div>
                      <SidebarLink active={activeFeature === 'members'} icon="fa-users-gear" label={t.members} onClick={() => { setActiveFeature('members'); setIsSidebarOpen(false); }} />
                      <SidebarLink active={activeFeature === 'logs'} icon="fa-terminal" label={t.logs} onClick={() => { setActiveFeature('logs'); setIsSidebarOpen(false); }} />
                    </>
                  )}
                </nav>
                <div className="pt-6 space-y-4">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setLang('id')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-cyan-500 text-black' : 'text-slate-600'}`}>ID</button>
                    <button onClick={() => setLang('en')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-600'}`}>EN</button>
                  </div>
                  <button onClick={() => window.location.reload()} className="w-full py-4 border border-white/5 rounded-xl text-slate-600 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">{t.logout}</button>
                </div>
             </aside>
             <main className="flex-1 overflow-y-auto bg-[#010409]">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden fixed top-6 right-6 z-[160] w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center backdrop-blur-md shadow-lg">
                  <i className="fa-solid fa-bars"></i>
                </button>
                <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeFeature} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
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

const SidebarLink: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full py-4 px-5 rounded-2xl flex items-center gap-4 transition-all group ${active ? 'bg-cyan-500/10 text-white border border-cyan-500/20 shadow-lg' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}>
    <i className={`fa-solid ${icon} text-sm ${active ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`}></i>
    <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const DashboardMenu: React.FC<{ onSelect: (f: Feature) => void; isAdmin: boolean; t: any; lang: Lang; setLang: (l: Lang) => void; credits: number }> = ({ onSelect, isAdmin, t, lang, setLang, credits }) => (
  <div className="space-y-12">
    <header className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">{t.status}</p>
        </div>
      </div>
      <h2 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter text-white leading-none">{t.title} <span className="text-cyan-400">Hub</span></h2>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">{t.subtitle}</p>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MenuCard icon="fa-comment-dots" title={t.aiAssistant} desc="Tanya solusi cerdas ke AI." onClick={() => onSelect('chat')} highlight />
      <MenuCard icon="fa-image" title={t.visualArt} desc="20 CR / Image" onClick={() => onSelect('txt2img')} />
      <MenuCard icon="fa-microphone-lines" title={t.voice} desc="150 CR / Process" onClick={() => onSelect('voice-cloning')} highlight />
      <MenuCard icon="fa-video" title={t.video} desc="150 CR / Process" onClick={() => onSelect('img2vid')} />
      <MenuCard icon="fa-film" title={t.studio} desc="Pro Production Workflow" onClick={() => onSelect('studio')} />
      <MenuCard icon="fa-inbox" title={t.inbox} desc="Direct P2P Message" onClick={() => onSelect('direct-chat')} highlight />
      {isAdmin && (
        <>
          <MenuCard icon="fa-users-gear" title={t.members} desc="Manage Users & Credits" onClick={() => onSelect('members')} highlight />
          <MenuCard icon="fa-terminal" title={t.logs} desc="Check System Health" onClick={() => onSelect('logs')} />
        </>
      )}
      <MenuCard icon="fa-shield" title="Security" desc="Manage Account Safety" onClick={() => onSelect('profile')} />
    </div>
  </div>
);

const MenuCard: React.FC<{ icon: string; title: string; desc: string; onClick: () => void; highlight?: boolean }> = ({ icon, title, desc, onClick, highlight }) => (
    <button onClick={onClick} className={`w-full glass-panel p-8 rounded-[3rem] text-left border transition-all active:scale-95 flex flex-col h-full ${highlight ? 'border-cyan-500/30 bg-cyan-500/5 shadow-2xl' : 'border-white/5 hover:border-cyan-500/20'}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-all ${highlight ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'bg-slate-900 border-white/5 group-hover:bg-cyan-500 group-hover:text-black'}`}>
          <i className={`fa-solid ${icon} text-2xl`}></i>
      </div>
      <h3 className="text-2xl font-black italic uppercase text-white mb-2 tracking-tighter">{title}</h3>
      <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest leading-relaxed mb-4">{desc}</p>
    </button>
);

export default App;
