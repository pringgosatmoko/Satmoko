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
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

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

      if (memberError) throw new Error("Gagal verifikasi data member.");
      
      if (!member || (member.status !== 'active' && !isAdmin(email))) {
        await supabase.auth.signOut();
        throw new Error('Akun Anda belum aktif. Selesaikan pembayaran atau tunggu verifikasi admin.');
      }

      onLoginSuccess(email);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk ke sistem.');
      setLoading(false);
    }
  };

  const handleRegisterMode = (e: React.FormEvent) => {
    e.preventDefault();
    setMode('plan');
  };

  const executePaymentAndRegister = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');

    const orderId = `STR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Dapatkan Snap Token dari Backend
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

      const paymentData = await response.json();
      if (!response.ok) throw new Error(paymentData.error || 'Gagal membuat sesi pembayaran.');

      // 2. Buka Midtrans Snap
      snap.pay(paymentData.token, {
        onSuccess: async (result: any) => {
          await finalizeRegistration(orderId, 'settlement');
        },
        onPending: async (result: any) => {
          await finalizeRegistration(orderId, 'pending');
        },
        onError: () => {
          setError('Pembayaran gagal atau dibatalkan.');
          setLoading(false);
        },
        onClose: () => {
          setError('Selesaikan pembayaran untuk mengaktifkan akun.');
          setLoading(false);
        }
      });

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  const finalizeRegistration = async (orderId: string, paymentStatus: string) => {
    try {
      // Create Auth User
      const { error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;

      // Create Member Record
      const { error: dbError } = await supabase.from('members').insert([{
        email: email.toLowerCase(),
        full_name: fullName,
        status: paymentStatus === 'settlement' ? 'active' : 'pending',
        credits: paymentStatus === 'settlement' ? selectedPlan.credits : 0,
        metadata: {
          order_id: orderId,
          plan_id: selectedPlan.id,
          credits_to_add: selectedPlan.credits,
          days_to_add: selectedPlan.days
        }
      }]);

      if (dbError) throw dbError;

      sendTelegramNotification(`🆕 REGISTRASI BARU\nUser: ${fullName}\nEmail: ${email}\nPlan: ${selectedPlan.label}\nStatus: ${paymentStatus}`);

      setSuccessMsg(paymentStatus === 'settlement' 
        ? 'Pembayaran berhasil! Silakan login.' 
        : 'Pesanan dibuat! Akun akan aktif otomatis setelah pembayaran diverifikasi.'
      );
      setMode('login');
    } catch (err: any) {
      setError('Akun dibuat tapi gagal sinkronisasi database. Hubungi admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-950">
      <div className="mb-8">
        <LandingHero />
      </div>

      <div className="w-full max-w-md p-8 glass rounded-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tighter text-white">SATMOKO <span className="text-cyan-400">STUDIO</span></h1>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest font-bold">Secure Creative Command Center</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl text-xs font-bold text-center border bg-red-500/10 border-red-500/20 text-red-500">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl text-xs font-bold text-center border bg-green-500/10 border-green-500/20 text-green-500">
            {successMsg}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email Address" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={loading} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95">
              {loading ? 'AUTHORIZING...' : 'LOGIN TO HUB'}
            </button>
            <button type="button" onClick={() => setMode('register')} className="w-full text-[10px] font-bold text-slate-500 hover:text-cyan-400 uppercase tracking-widest">Register Workspace</button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterMode} className="space-y-4">
            <input type="text" placeholder="Full Name" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="email" placeholder="Email Address" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Create Password" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="w-full py-4 bg-white text-black font-extrabold rounded-xl transition-all active:scale-95">CONTINUE TO PLANS</button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-[10px] font-bold text-slate-500 hover:text-cyan-400 uppercase tracking-widest">Back to Login</button>
          </form>
        )}

        {mode === 'plan' && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-cyan-400 uppercase text-center tracking-widest">Select Your Workspace Tier</p>
            <div className="space-y-2">
              {PLANS.map(plan => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${selectedPlan?.id === plan.id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                  <div className="text-left">
                    <p className="text-xs font-bold">{plan.label}</p>
                    <p className="text-[8px] opacity-50">{plan.credits} Credits • {plan.days} Days</p>
                  </div>
                  <p className="text-xs font-black">Rp {plan.price.toLocaleString()}</p>
                </button>
              ))}
            </div>
            <button onClick={executePaymentAndRegister} disabled={loading || !selectedPlan} className="w-full py-4 bg-cyan-500 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95">
              {loading ? 'PREPARING GATEWAY...' : 'PAY & REGISTER'}
            </button>
            <button onClick={() => setMode('register')} className="w-full text-[10px] font-bold text-slate-500 uppercase text-center">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};