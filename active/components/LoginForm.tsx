
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
        throw new Error('Akses ditolak. Selesaikan pembayaran atau tunggu aktivasi.');
      }
      onLoginSuccess(email);
    } catch (err: any) {
      setError(err.message || 'Gagal login.');
      setLoading(false);
    }
  };

  const startPaymentFlow = async () => {
    if (!selectedPlan || !email || !password || !fullName) {
      setError('Lengkapi semua data registrasi.');
      return;
    }
    setLoading(true);
    setError('');
    const orderId = `REG-${Date.now()}`;
    
    try {
      // 1. Buat akun Auth & Member (status pending) terlebih dahulu
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { full_name: fullName } }
      });
      if (signUpError) throw signUpError;

      await supabase.from('members').insert([{
        email: email.toLowerCase(),
        full_name: fullName,
        status: 'pending',
        credits: 0,
        metadata: { 
          order_id: orderId, 
          plan: selectedPlan.label, 
          credits_to_add: selectedPlan.credits,
          days_to_add: selectedPlan.days 
        }
      }]);

      // 2. Ambil Snap Token dari Backend
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
      if (data.error) throw new Error(data.error);

      // 3. Jalankan Midtrans Snap
      snap.pay(data.token, {
        onSuccess: () => {
          sendTelegramNotification(`💰 PEMBAYARAN BERHASIL: ${email} (${selectedPlan.label})`);
          setInfo('Pembayaran sukses! Akun akan aktif dalam beberapa saat.');
          setMode('login');
          setLoading(false);
        },
        onPending: () => {
          setInfo('Menunggu pembayaran. Silakan selesaikan transaksi Anda.');
          setMode('login');
          setLoading(false);
        },
        onError: () => {
          setError('Terjadi kesalahan saat memproses pembayaran.');
          setLoading(false);
        },
        onClose: () => {
          setInfo('Transaksi dibatalkan. Anda bisa melanjutkan pembayaran nanti.');
          setMode('login');
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Gagal memulai registrasi.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <LandingHero />
        
        <div className="glass border border-white/5 p-8 rounded-[2rem] space-y-6 bg-slate-900/40 mt-4 shadow-2xl">
          <div className="text-center">
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">
              {mode === 'login' ? 'Authentication' : mode === 'register' ? 'Registration' : 'Select Plan'}
            </h2>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-500 text-center uppercase">{error}</div>}
          {info && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-[10px] font-bold text-green-500 text-center uppercase">{info}</div>}

          <div className="space-y-4">
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="EMAIL" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none focus:border-cyan-500/40" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="PASSWORD" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none focus:border-cyan-500/40" value={password} onChange={e => setPassword(e.target.value)} required />
                <button disabled={loading} className="w-full py-4 bg-cyan-500 text-black font-black text-[10px] uppercase rounded-xl hover:bg-white transition-colors">
                  {loading ? 'PROCESSING...' : 'SIGN IN'}
                </button>
                <div className="flex justify-between items-center px-1">
                  <button type="button" onClick={() => setMode('register')} className="text-[9px] font-black text-slate-600 hover:text-cyan-400 uppercase tracking-widest">Create Account</button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <div className="space-y-4">
                <input type="text" placeholder="FULL NAME" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={fullName} onChange={e => setFullName(e.target.value)} />
                <input type="email" placeholder="EMAIL ADDRESS" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="PASSWORD" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                <button onClick={() => setMode('plan')} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase rounded-xl">
                  NEXT: SELECT PLAN
                </button>
                <button onClick={() => setMode('login')} className="w-full text-[9px] font-black text-slate-600 uppercase tracking-widest text-center block">Back to Login</button>
              </div>
            )}

            {mode === 'plan' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {PLANS.map(plan => (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${selectedPlan?.id === plan.id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-black/40 border-white/5 text-slate-500'}`}>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase">{plan.label}</p>
                        <p className="text-[8px] uppercase">{plan.credits} Credits</p>
                      </div>
                      <p className="text-[10px] font-black italic">Rp {plan.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
                <button onClick={startPaymentFlow} disabled={loading || !selectedPlan} className="w-full py-5 bg-cyan-500 text-black font-black uppercase text-[10px] rounded-xl shadow-2xl disabled:opacity-20">
                  {loading ? 'INITIATING...' : 'PAY & REGISTER'}
                </button>
                <button onClick={() => setMode('register')} className="w-full text-[9px] font-black text-slate-600 uppercase text-center block">Back</button>
              </div>
            )}
          </div>
          
          <div className="pt-4 opacity-10 flex flex-col items-center">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">ORA NGAPAK ORA KEPENAK</p>
          </div>
        </div>
      </div>
    </div>
  );
};
