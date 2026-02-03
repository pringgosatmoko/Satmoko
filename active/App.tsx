
import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { supabase, isAdmin } from './lib/api';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const verifyUserStatus = async (email: string) => {
    if (!email) return false;
    if (isAdmin(email)) return true;
    
    try {
      const { data: member, error } = await supabase
        .from('members')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (error || !member) return false;
      return member.status === 'active';
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const isActive = await verifyUserStatus(session.user.email);
        if (isActive) {
          setUserEmail(session.user.email);
          setIsLoggedIn(true);
        } else {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
        }
      }
      setCheckingSession(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const isActive = await verifyUserStatus(session.user.email);
        if (isActive) {
          setUserEmail(session.user.email);
          setIsLoggedIn(true);
        } else {
          if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
             await supabase.auth.signOut();
          }
          setIsLoggedIn(false);
          setUserEmail('');
        }
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  if (checkingSession) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
       <div className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Initializing Hub...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      {!isLoggedIn ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard userEmail={userEmail} onLogout={() => supabase.auth.signOut()} />
      )}
    </div>
  );
};

export default App;
