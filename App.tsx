
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LoginForm } from './components/LoginForm.tsx';
import { InfoOverlay } from './components/InfoOverlay.tsx';
import { isAdmin as checkAdmin, supabase } from './lib/api.ts';

// UI Elements
import { LandingHero } from './components/LandingHero.tsx';
import { SloganAnimation } from './components/SloganAnimation.tsx';
import { StartAnimation } from './components/StartAnimation.tsx';

// Views
import { HomeView } from './views/HomeView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { CreateOverlay } from './views/CreateOverlay.tsx';
import { DirectChat } from './components/DirectChat.tsx';
import { ChatAssistant } from './components/ChatAssistant.tsx';
import { ImageGenerator } from './components/ImageGenerator.tsx';
import { VideoGenerator } from './components/VideoGenerator.tsx';
import { MemberControl } from './components/MemberControl.tsx';
import { StorageManager } from './components/StorageManager.tsx';
import { SystemLogs } from './components/SystemLogs.tsx';
import { PriceManager } from './components/PriceManager.tsx';
import { ProfileSettings } from './components/ProfileSettings.tsx';
import { FaceSwap } from './components/FaceSwap.tsx';
import { AspectRatioEditor } from './components/AspectRatioEditor.tsx';
import { TopupCenter } from './components/TopupCenter.tsx';
import { TopupManager } from './components/TopupManager.tsx';
import { motion, AnimatePresence } from 'framer-motion';

export type Tab = 'home' | 'play' | 'create' | 'explore' | 'profile';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [credits, setCredits] = useState(0);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [subView, setSubView] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => { 
    return () => { isMounted.current = false; }; 
  }, []);

  const checkMemberStatus = useCallback(async (email: string) => {
    if (!email || !isMounted.current) {
      setIsCheckingSession(false);
      return;
    }
    
    const emailLower = email.toLowerCase().trim();
    setIsSyncing(true);
    
    if (checkAdmin(emailLower)) {
      setCredits(999999);
      setUserFullName("MASTER ADMIN");
      setUserEmail(emailLower);
      setIsPro(true);
      setIsLoggedIn(true);
      setIsPendingPayment(false);
      setIsCheckingSession(false);
      setIsSyncing(false);
      return;
    }

    if (!supabase) {
      setIsCheckingSession(false);
      setIsSyncing(false);
      return;
    }

    try {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();
        
      if (!isMounted.current) return;

      if (member && !memberError) {
        if (member.status === 'active') {
          setCredits(member.credits || 0);
          setUserFullName(member.full_name || emailLower.split('@')[0].toUpperCase());
          setUserEmail(emailLower);
          setIsPro((member.credits || 0) > 100);
          setIsLoggedIn(true);
          setIsPendingPayment(false);
        } else {
          setUserEmail(emailLower);
          setUserFullName(member.full_name || "");
          setIsLoggedIn(false);
          setIsPendingPayment(true);
        }
      } else {
        setUserEmail(emailLower);
        setIsLoggedIn(false);
        setIsPendingPayment(false);
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
        setIsCheckingSession(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!supabase) {
        setIsCheckingSession(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          await checkMemberStatus(session.user.email);
        } else {
          setIsCheckingSession(false);
        }
      } catch (e) {
        setIsCheckingSession(false);
      }
    };
    loadSession();
  }, [checkMemberStatus]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsPendingPayment(false);
    setUserEmail('');
    window.location.reload();
  };

  const isAdmin = useMemo(() => checkAdmin(userEmail), [userEmail]);

  if (showIntro) {
    return <StartAnimation onComplete={() => setShowIntro(false)} />;
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#010409] flex items-center justify-center">
         <motion.div 
           animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.2, 0.5, 0.2] }} 
           transition={{ duration: 1.2, repeat: Infinity }}
           className="w-12 h-12 rounded-full border border-cyan-500/10 flex items-center justify-center"
         >
           <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_15px_#22d3ee]"></div>
         </motion.div>
      </div>
    );
  }

  const renderView = () => {
    if (subView === 'txt2img') return <ImageGenerator onBack={() => setSubView(null)} userEmail={userEmail} credits={credits} refreshCredits={() => checkMemberStatus(userEmail)} />;
    if (subView === 'img2vid') return <VideoGenerator mode="img2vid" onBack={() => setSubView(null)} lang="id" userEmail={userEmail} credits={credits} refreshCredits={() => checkMemberStatus(userEmail)} />;
    if (subView === 'faceswap') return <FaceSwap onBack={() => setSubView(null)} userEmail={userEmail} credits={credits} refreshCredits={() => checkMemberStatus(userEmail)} />;
    if (subView === 'reframe') return <AspectRatioEditor onBack={() => setSubView(null)} lang="id" userEmail={userEmail} credits={credits} refreshCredits={() => checkMemberStatus(userEmail)} />;
    if (subView === 'topup') return <div className="px-6 pt-8"><TopupCenter onBack={() => setSubView(null)} userEmail={userEmail} credits={credits} refreshCredits={() => checkMemberStatus(userEmail)} lang="id" /></div>;
    if (subView === 'admin_members') return <div className="px-6 pt-8"><MemberControl onBack={() => setSubView(null)} lang="id" /></div>;
    if (subView === 'admin_storage') return <div className="px-6 pt-8"><StorageManager onBack={() => setSubView(null)} lang="id" /></div>;
    if (subView === 'admin_logs') return <div className="px-6 pt-8"><SystemLogs onBack={() => setSubView(null)} /></div>;
    if (subView === 'admin_pricing') return <div className="px-6 pt-8"><PriceManager onBack={() => setSubView(null)} lang="id" /></div>;
    if (subView === 'admin_topups') return <div className="px-6 pt-8"><TopupManager onBack={() => setSubView(null)} lang="id" /></div>;
    if (subView === 'security_settings') return <div className="px-6 pt-8"><ProfileSettings onBack={() => setSubView(null)} userEmail={userEmail} credits={credits} validUntil={null} lang="id" /></div>;

    switch (activeTab) {
      case 'home': return <HomeView key={`home-${userEmail}`} userFullName={userFullName} userEmail={userEmail} credits={credits} isPro={isPro} onAction={(act) => setSubView(act)} onLogout={handleLogout} />;
      case 'play': return <DirectChat userEmail={userEmail} isAdmin={isAdmin} adminEmail="pringgosatmoko@gmail.com" onBack={() => setActiveTab('home')} />;
      case 'explore': return <ChatAssistant onBack={() => setActiveTab('home')} lang="id" />;
      case 'profile': return <ProfileView key={`profile-${userEmail}`} userFullName={userFullName} userEmail={userEmail} credits={credits} isPro={isPro} isAdmin={isAdmin} onLogout={handleLogout} onAction={(act) => setSubView(act)} />;
      default: return <HomeView userFullName={userFullName} userEmail={userEmail} credits={credits} isPro={isPro} onAction={() => {}} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#010409] text-white flex flex-col font-sans overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div 
            key="auth-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center p-6 pt-10 relative min-h-screen overflow-y-auto no-scrollbar scroll-smooth"
          >
            <div className="w-full max-w-md flex flex-col items-center">
              
              {/* Logo Master Section */}
              <div className="flex flex-col items-center mb-8">
                <LandingHero />
                <div className="mt-[-30px]">
                  <SloganAnimation />
                </div>
              </div>

              {/* Login/Registration Section */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="w-full"
              >
                {!isPendingPayment ? (
                  <LoginForm onSuccess={(email) => checkMemberStatus(email)} lang="id" initialEmail={userEmail} />
                ) : (
                  <div className="w-full bg-[#0d1117]/80 border border-white/5 p-10 rounded-[3.5rem] shadow-2xl text-center space-y-8 backdrop-blur-3xl">
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto border border-yellow-500/20">
                        <i className="fa-solid fa-hourglass-half text-yellow-500 text-xl animate-spin-slow"></i>
                      </div>
                      <h2 className="text-xl font-black italic text-white uppercase tracking-tighter leading-none">Menunggu <br/><span className="text-yellow-500">Pembayaran</span></h2>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">System Sync for Node:<br/>{userEmail}</p>
                    </div>
                    <div className="space-y-3">
                      <button onClick={() => checkMemberStatus(userEmail)} disabled={isSyncing} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-lg active:scale-95 disabled:opacity-50">
                        {isSyncing ? "SYNCING..." : "RE-CHECK STATUS"}
                      </button>
                      <button onClick={handleLogout} className="w-full text-[9px] font-black text-slate-800 uppercase py-2 tracking-widest">CANCEL & LOGOUT</button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowInfo(true)} 
                  className="w-full mt-10 py-5 text-[9px] font-black text-white/20 uppercase tracking-[0.5em] border border-white/5 rounded-2xl transition-all hover:text-white/60 hover:bg-white/5"
                >
                  SYSTEM INFO & CONTACT MASTER
                </button>
              </div>
            </div>
            {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} lang="id" />}
          </motion.div>
        ) : (
          /* Fix: Cleaned up motion.div to ensure proper JSX parsing and avoid "Cannot find name 'div'" */
          <motion.div 
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen relative overflow-hidden bg-[#010409]"
          >
            <main className="flex-1 overflow-y-auto no-scrollbar pb-28">
              {renderView()}
            </main>
            <nav className="fixed bottom-0 left-0 right-0 px-8 py-5 flex items-center justify-between z-[100] pb-10 border-t border-white/5 bg-[#010409]/95 backdrop-blur-xl">
              <NavButton active={activeTab === 'home' && !subView} icon="fa-house" onClick={() => {setActiveTab('home'); setSubView(null);}} />
              <NavButton active={activeTab === 'play'} icon="fa-play" onClick={() => {setActiveTab('play'); setSubView(null);}} />
              <button onClick={() => setShowCreateMenu(true)} className="w-14 h-14 bg-purple-gradient rounded-full flex items-center justify-center shadow-lg -mt-12 border-4 border-[#010409] active:scale-95">
                <i className="fa-solid fa-plus text-xl text-white"></i>
              </button>
              <NavButton active={activeTab === 'explore'} icon="fa-globe" onClick={() => {setActiveTab('explore'); setSubView(null);}} />
              <NavButton active={activeTab === 'profile'} icon="fa-circle-user" onClick={() => {setActiveTab('profile'); setSubView(null);}} />
            </nav>
            {showCreateMenu && <CreateOverlay onClose={() => setShowCreateMenu(false)} onSelect={(mode) => { setShowCreateMenu(false); setSubView(mode); }} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, icon, onClick }: { active: boolean, icon: string, onClick: () => void }) => (
  <button onClick={onClick} className={`text-xl transition-all ${active ? 'text-cyan-500' : 'text-slate-800'}`}>
    <i className={`fa-solid ${icon}`}></i>
  </button>
);

