
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-[14px] font-bold text-cyan-500 uppercase tracking-[0.6em]">INITIALIZING HUB...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {!isLoggedIn ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard userEmail={userEmail} onLogout={() => supabase.auth.signOut()} />
      )}
    </div>
  );
};

export default App;
