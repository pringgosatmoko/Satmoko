
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LoginForm } from './components/LoginForm';
import { InfoOverlay } from './components/InfoOverlay';
import { isAdmin as checkAdmin, supabase, updateMemberStatus, verifyMidtransPayment, processMidtransTopup, logActivity } from './lib/api';
import { AnimatePresence, motion } from 'framer-motion';

// Elements
import { LandingHero } from './components/LandingHero';
import { SloganAnimation } from './components/SloganAnimation';
import { StartAnimation } from './components/StartAnimation';

// Views
import { HomeView } from './views/HomeView';
import { ProfileView } from './views/ProfileView';
import { CreateOverlay } from './views/CreateOverlay';
import { DirectChat } from './components/DirectChat';
import { ChatAssistant } from './components/ChatAssistant';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { MemberControl } from './components/MemberControl';
import { StorageManager } from './components/StorageManager';
import { SystemLogs } from './components/SystemLogs';
import { PriceManager } from './components/PriceManager';
import { ProfileSettings } from './components/ProfileSettings';
import { FaceSwap } from './components/FaceSwap';
import { AspectRatioEditor } from './components/AspectRatioEditor';
import { TopupCenter } from './components/TopupCenter';
import { TopupManager } from './components/TopupManager';

export type Tab = 'home' | 'play' | 'create' | 'explore' | 'profile';

const App: React.FC = () => {
  const [showStartIntro, setShowStartIntro] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [credits, setCredits] = useState(0);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [subView, setSubView] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const [envError, setEnvError] = useState<string | null>(null);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const openMidtransPopup = useCallback((token: string, email: string, credits: number, orderId: string) => {
    if ((window as any).snap) {
      (window as any).snap.pay(token, {
        onSuccess: async () => {
          await processMidtransTopup(email, credits, orderId);
          logActivity('PAYMENT_SUCCESS', `User ${email} topup ${credits} CR (Midtrans)`);
          window.location.reload();
        },
        onPending: () => { window.location.reload(); },
        onClose: () => { window.location.reload(); }
      });
    }
  }, []);

  const checkMemberStatus = useCallback(async (email: string) => {
    if (!email || !isMounted.current || !supabase) {
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
          const planMeta = member.metadata || {};

          // Auto-verify Midtrans status for pending users
          if (planMeta.order_id) {
            const verification = await verifyMidtransPayment(planMeta.order_id);
            if (verification.isPaid) {
              await processMidtransTopup(emailLower, planMeta.credits || 1000, planMeta.order_id);
              return checkMemberStatus(emailLower); // Refresh status
            }
          }

          setPendingPlan(planMeta);
          setUserEmail(emailLower);
          setUserFullName(member.full_name || "");
          setIsLoggedIn(false);
          setIsPendingPayment(true);

          if (planMeta.snap_token) {
            setTimeout(() => openMidtransPopup(planMeta.snap_token, emailLower, planMeta.credits, planMeta.order_id), 1000);
          }
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
  }, [openMidtransPopup]);

  useEffect(() => {
    if (!supabase) {
      setEnvError("SUPABASE_CONFIG_MISSING: Pastikan VITE_DATABASE_URL dan VITE_SUPABASE_ANON terpasang di Dashboard Vercel Master.");
      setIsCheckingSession(false);
      return;
    }

    const loadSession = async () => {
      const timeout = setTimeout(() => {
        if (isCheckingSession && isMounted.current) {
          setIsCheckingSession(false);
        }
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          await checkMemberStatus(session.user.email);
        } else {
          setIsCheckingSession(false);
        }
      } catch (e) {
        setIsCheckingSession(false);
      } finally {
        clearTimeout(timeout);
      }
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email) {
        checkMemberStatus(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setIsPendingPayment(false);
        setUserEmail('');
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkMemberStatus]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsPendingPayment(false);
    setUserEmail('');
    window.location.reload();
  };

  const isAdmin = useMemo(() => checkAdmin(userEmail), [userEmail]);

  if (showStartIntro) {
    return <StartAnimation onComplete={() => setShowStartIntro(false)} />;
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-[#010409] flex flex-col items-center justify-center p-10 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-500 text-5xl mb-6"></i>
        <h1 className="text-white font-black uppercase text-xl mb-4 tracking-tighter">KESALAHAN KONFIGURASI</h1>
        <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-sm uppercase">{envError}</p>
        <button onClick={() => window.location.reload()} className="mt-10 px-8 py-4 bg-white text-black font-black uppercase rounded-2xl text-[10px]">COBA LAGI</button>
      </div>
    );
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#010409] flex flex-col items-center justify-center p-6">
        <div className="relative w-24 h-24 mb-8">
           <motion.div 
             animate={{ rotate: 360 }} 
             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             className="absolute inset-0 border-t-2 border-cyan-500 rounded-full"
           />
           <div className="absolute inset-2 border-2 border-white/5 rounded-full" />
        </div>
        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.6em] animate-pulse">Establishing Neural Link...</p>
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
    <div className="min-h-screen bg-[#010409] text-white flex flex-col font-sans overflow-x-hidden">
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center p-6 bg-[#010409] overflow-y-auto no-scrollbar pt-12">
          <div className="w-full max-w-md flex flex-col items-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="mb-0">
              <LandingHero />
            </motion.div>
            <div className="mb-12">
               <SloganAnimation />
            </div>
            <div className="w-full">
              {!isPendingPayment ? (
                <LoginForm onSuccess={(email) => checkMemberStatus(email)} lang="id" initialEmail={userEmail} />
              ) : (
                <div className="w-full bg-[#0d1117] border border-white/5 p-10 rounded-[3rem] shadow-2xl text-center space-y-8">
                  <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20">
                    <i className={`fa-solid ${isSyncing ? 'fa-sync fa-spin text-cyan-500' : 'fa-clock text-cyan-500'} text-2xl`}></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">MENUNGGU KONFIRMASI</h2>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">{userEmail}</p>
                    {pendingPlan?.order_id && <p className="text-[8px] text-slate-800 mt-1 uppercase">ORDER ID: {pendingPlan.order_id}</p>}
                  </div>
                  <div className="space-y-3">
                    {pendingPlan?.snap_token && (
                       <button onClick={() => openMidtransPopup(pendingPlan.snap_token, userEmail, pendingPlan.credits, pendingPlan.order_id)} className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-lg">
                          BAYAR SEKARANG
                       </button>
                    )}
                    <button onClick={() => checkMemberStatus(userEmail)} disabled={isSyncing} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-lg active:scale-95 disabled:opacity-50">
                      {isSyncing ? "MENGECEK..." : "CEK PEMBAYARAN SEKARANG"}
                    </button>
                    <button onClick={handleLogout} className="w-full text-[9px] font-black text-slate-700 uppercase py-2">LOGOUT</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowInfo(true)} className="w-full mt-10 py-4 text-[9px] font-black text-slate-800 uppercase tracking-widest border border-white/5 rounded-2xl hover:bg-white/5">INFO & KONTAK</button>
          </div>
          <AnimatePresence>
            {showInfo && <InfoOverlay onClose={() => setShowInfo(false)} lang="id" />}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col h-screen relative overflow-hidden">
          <main className="flex-1 overflow-y-auto no-scrollbar pb-28">{renderView()}</main>
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
        </div>
      )}
    </div>
  );
};

const NavButton = ({ active, icon, onClick }: { active: boolean, icon: string, onClick: () => void }) => (
  <button onClick={onClick} className={`text-xl transition-all ${active ? 'text-cyan-500' : 'text-slate-800'}`}>
    <i className={`fa-solid ${icon}`}></i>
  </button>
);

export default App;
