
import React, { useState } from 'react';
import { supabase, isAdmin, getAdminPassword, PLANS, sendTelegramNotification } from '../lib/api';
import { LandingHero } from './LandingHero';

declare const snap: any;

export const LoginForm: React.FC<{ onLoginSuccess: (email: string) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'plan'>('login');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (isAdmin(email) && password === getAdminPassword()) {
        onLoginSuccess(email);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.toLowerCase(), 
        password 
      });
      
      if (authError) throw authError;

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (memberError || !member || member.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Akses ditolak. Selesaikan pembayaran atau tunggu verifikasi admin.');
      }

      onLoginSuccess(email);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa email/password.');
      setLoading(false);
    }
  };

  const startPaymentFlow = async () => {
    if (!selectedPlan || !email || !password || !fullName) {
      setError('Lengkapi semua data sebelum melanjutkan.');
      return;
    }
    
    setLoading(true);
    setError('');
    const orderId = `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
      if (!response.ok) throw new Error(data.error || 'Gagal menghubungi gateway pembayaran.');

      snap.pay(data.token, {
        onSuccess: async () => await completeRegistration(orderId, 'active', selectedPlan.credits),
        onPending: async () => await completeRegistration(orderId, 'pending', 0),
        onError: () => { setError('Pembayaran gagal.'); setLoading(false); },
        onClose: () => { setError('Selesaikan pembayaran untuk mengaktifkan akun.'); setLoading(false); }
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const completeRegistration = async (orderId: string, status: 'active' | 'pending', initialCredits: number) => {
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase.from('members').insert([{
        email: email.toLowerCase(),
        full_name: fullName,
        status: status,
        credits: initialCredits,
        metadata: { order_id: orderId, plan: selectedPlan.label, price: selectedPlan.price }
      }]);

      if (dbError) throw dbError;
      sendTelegramNotification(`👤 REGISTRASI BARU\nEmail: ${email}\nPlan: ${selectedPlan.label}\nStatus: ${status}`);
      setInfo(status === 'active' ? 'Pembayaran sukses! Silakan login.' : 'Pesanan diterima! Menunggu verifikasi.');
      setMode('login');
    } catch (err: any) {
      setError('Data tersimpan namun ada kendala sinkronisasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
      
      {/* Logo Statis di Atas */}
      <div className="mb-4">
        <LandingHero />
      </div>

      {/* Container Form Statis */}
      <div className="w-full max-w-md p-10 glass rounded-[2.5rem] border border-white/5 space-y-8 shadow-2xl relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            SATMOKO <span className="text-cyan-400">STUDIO</span>
          </h1>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Secure Creative Command Hub</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-bold text-red-500 text-center uppercase tracking-widest">
            {error}
          </div>
        )}
        {info && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-[10px] font-bold text-green-500 text-center uppercase tracking-widest">
            {info}
          </div>
        )}

        <div className="space-y-6">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email Address" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-cyan-500/50 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-cyan-500/50 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
              <button disabled={loading} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50">
                {loading ? 'AUTHORIZING...' : 'LOGIN TO HUB'}
              </button>
              <button type="button" onClick={() => setMode('register')} className="w-full text-[10px] font-black text-slate-600 hover:text-cyan-400 uppercase tracking-widest transition-colors">
                Create New Workspace
              </button>
            </form>
          )}

          {mode === 'register' && (
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-cyan-500/50 outline-none transition-all" value={fullName} onChange={e => setFullName(e.target.value)} required />
              <input type="email" placeholder="Email Address" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-cyan-500/50 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Create Password" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-cyan-500/50 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} required />
              <button onClick={() => setMode('plan')} className="w-full py-4 bg-white text-black font-black uppercase rounded-2xl hover:bg-cyan-400 transition-all shadow-xl active:scale-95">
                CONTINUE TO PLANS
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-[10px] font-black text-slate-600 hover:text-cyan-400 uppercase tracking-widest transition-colors">
                Back to Login
              </button>
            </div>
          )}

          {mode === 'plan' && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-cyan-400 uppercase text-center tracking-widest">Select Your Production Tier</p>
              <div className="space-y-2">
                {PLANS.map(plan => (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all ${selectedPlan?.id === plan.id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-black/40 border-white/5 text-slate-500'}`}>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{plan.label}</p>
                      <p className="text-[9px] uppercase font-bold">{plan.credits} Credits • {plan.days} Days</p>
                    </div>
                    <p className="text-xs font-black italic">Rp {plan.price.toLocaleString()}</p>
                  </button>
                ))}
              </div>
              <button onClick={startPaymentFlow} disabled={loading || !selectedPlan} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl hover:bg-cyan-400 transition-all shadow-2xl active:scale-95 disabled:opacity-20">
                {loading ? 'PREPARING GATEWAY...' : 'PAY & ACTIVATE'}
              </button>
              <button type="button" onClick={() => setMode('register')} className="w-full text-[10px] font-black text-slate-600 hover:text-cyan-400 uppercase tracking-widest text-center">
                Back to Details
              </button>
            </div>
          )}
        </div>
        
        <div className="pt-4 opacity-10 flex flex-col items-center">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.6em]">ORA NGAPAK ORA KEPENAK</p>
        </div>
      </div>
    </div>
  );
};
