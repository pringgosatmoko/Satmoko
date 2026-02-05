
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
      const { data } = await supabase
        .from('members')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      return data?.status === 'active';
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
        }
      }
      setCheckingSession(false);
    };
    initSession();
  }, []);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-[11px] font-bold text-[#22d3ee] uppercase tracking-[0.4em]">CONNECTING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-[#22d3ee]/30">
      {!isLoggedIn ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard userEmail={userEmail} onLogout={() => supabase.auth.signOut()} />
      )}
    </div>
  );
};

export default App;
