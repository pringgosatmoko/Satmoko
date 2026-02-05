
import React, { useState } from 'react';
import { supabase, isAdmin, getAdminPassword, PLANS, sendTelegramNotification } from '../lib/api';

declare const snap: any;

export const LoginForm: React.FC<{ onLoginSuccess: (email: string) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'plan'>('login');
  const [selectedPlan, setSelectedPlan] = useState<any>(PLANS[1]); // Default PRO
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isAdmin(email) && password === getAdminPassword()) {
        onLoginSuccess(email);
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.toLowerCase(), 
        password 
      });
      if (authError) throw authError;

      const { data: member } = await supabase
        .from('members')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (!member || member.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('ACCESS DENIED. PLEASE ACTIVATE YOUR ACCOUNT.');
      }
      onLoginSuccess(email);
    } catch (err: any) {
      setError(err.message || 'LOGIN FAILED.');
      setLoading(false);
    }
  };

  const startPaymentFlow = async () => {
    if (!selectedPlan || !email || !password || !fullName) {
      setError('PLEASE COMPLETE REGISTRATION DATA.');
      return;
    }
    setLoading(true);
    setError('');
    const orderId = `REG-${Date.now()}`;
    
    try {
      const response = await fetch('/api/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          amount: selectedPlan.price, 
          email: email.toLowerCase(), 
          fullName 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || "Gagal mendapatkan token transaksi.");
      }

      if (typeof snap !== 'undefined') {
        snap.pay(data.token, {
          onSuccess: () => {
            sendTelegramNotification(`💰 PAYMENT SUCCESS: ${email}`);
            setInfo('SUCCESS! ACCOUNT ACTIVE.');
            setMode('login');
            setLoading(false);
          },
          onError: (err: any) => {
            console.error("Snap Error:", err);
            setError('MIDTRANS REJECTED: Pastikan Client Key dan Server Key Master berasal dari environment yang SAMA.');
            setLoading(false);
          },
          onClose: () => setLoading(false)
        });
      } else {
        throw new Error('Snap.js belum termuat. Harap periksa koneksi internet Master.');
      }
    } catch (err: any) {
      setError(err.message || 'TRANSACTION FAILED.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#020617] p-6 overflow-y-auto pt-10">
      
      {/* JUDUL UTAMA - Dibuat statis dan bersih */}
      <div className="mb-10 text-center select-none w-full">
        <h1 className="text-[#22d3ee] font-bold text-xl md:text-2xl uppercase tracking-[0.8em] italic">
          SATMOKO STUDIO
        </h1>
      </div>

      {/* CONTAINER FORM - Dirampingkan agar pas di layar HP */}
      <div className="w-full max-w-[420px] bg-[#0f172a]/30 border border-white/5 p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-8 backdrop-blur-md mb-20">
        
        <div className="text-center">
          <h2 className="text-[#22d3ee] text-[10px] font-black uppercase tracking-[0.4em]">
            {mode === 'login' ? 'Authentication' : mode === 'register' ? 'Registration' : 'SELECT PLAN'}
          </h2>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[9px] font-bold text-red-500 text-center uppercase leading-relaxed tracking-wider">
            {error}
          </div>
        )}

        {info && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-[9px] font-bold text-green-500 text-center uppercase tracking-wider">
            {info}
          </div>
        )}

        <div className="space-y-4">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="EMAIL" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none focus:border-[#22d3ee]/40" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="PASSWORD" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none focus:border-[#22d3ee]/40" value={password} onChange={e => setPassword(e.target.value)} required />
              <button disabled={loading} className="w-full py-4 bg-[#22d3ee] text-black font-black text-[11px] uppercase rounded-2xl shadow-lg active:scale-95 transition-transform">
                {loading ? 'WAIT...' : 'SIGN IN'}
              </button>
              <button type="button" onClick={() => setMode('register')} className="w-full text-[9px] font-bold text-slate-600 uppercase tracking-widest text-center mt-2">Create Account</button>
            </form>
          )}

          {mode === 'register' && (
            <div className="space-y-4">
              <input type="text" placeholder="FULL NAME" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={fullName} onChange={e => setFullName(e.target.value)} />
              <input type="email" placeholder="EMAIL ADDRESS" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="PASSWORD" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={password} onChange={e => setPassword(e.target.value)} />
              <button onClick={() => setMode('plan')} className="w-full py-4 bg-white text-black font-black text-[11px] uppercase rounded-2xl">NEXT: SELECT PLAN</button>
              <button onClick={() => setMode('login')} className="w-full text-[9px] font-bold text-slate-600 uppercase tracking-widest text-center mt-2">Back</button>
            </div>
          )}

          {mode === 'plan' && (
            <div className="space-y-6">
              <div className="space-y-3">
                {PLANS.map(plan => (
                  <button 
                    key={plan.id} 
                    onClick={() => setSelectedPlan(plan)} 
                    className={`w-full p-6 rounded-2xl border flex justify-between items-center transition-none ${selectedPlan?.id === plan.id ? 'bg-transparent border-[#22d3ee] text-[#22d3ee]' : 'bg-black/40 border-white/5 text-slate-500'}`}
                  >
                    <div className="text-left">
                      <p className="text-[11px] font-black uppercase tracking-wider">{plan.label}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-600 mt-1">{plan.credits} CREDITS</p>
                    </div>
                    <p className="text-[11px] font-black italic">Rp {plan.price.toLocaleString()}</p>
                  </button>
                ))}
              </div>
              <button onClick={startPaymentFlow} disabled={loading || !selectedPlan} className="w-full py-5 bg-[#22d3ee] text-black font-black uppercase text-[11px] rounded-2xl tracking-widest shadow-xl active:scale-95 transition-transform">
                {loading ? 'PROCESSING...' : 'PAY & REGISTER'}
              </button>
              <button onClick={() => setMode('register')} className="w-full text-[9px] font-bold text-slate-600 uppercase text-center block tracking-widest mt-2">BACK</button>
            </div>
          )}
        </div>
        
        <div className="pt-4 opacity-10 flex flex-col items-center">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.5em]">ORA NGAPAK ORA KEPENAK</p>
        </div>
      </div>
    </div>
  );
};
