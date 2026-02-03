import React, { useState } from 'react';
import { supabase, isAdmin, getAdminPassword, PLANS } from '../lib/api';

export const LoginForm: React.FC<{ onLoginSuccess: (email: string) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'plan'>('login');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Jalur Admin (Bypass)
      if (isAdmin(email) && password === getAdminPassword()) {
        onLoginSuccess(email);
        return;
      }

      // 2. Login Reguler
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.toLowerCase(), 
        password 
      });
      
      if (authError) throw authError;

      // 3. Cek Status di Tabel Members
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('status')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (memberError) throw new Error("Gagal verifikasi data member.");
      
      // Jika member belum ada atau inactive, paksa logout
      if (!member || (member.status !== 'active' && !isAdmin(email))) {
        await supabase.auth.signOut();
        throw new Error('Akun Anda belum aktif atau sedang dalam verifikasi pembayaran.');
      }

      onLoginSuccess(email);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk ke sistem.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMode('plan'); // Lanjut ke pemilihan paket
  };

  const executeRegistration = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');

    try {
      // 1. Sign Up di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;

      // 2. Masukkan ke tabel members dengan status pending
      const { error: dbError } = await supabase.from('members').insert([{
        email: email.toLowerCase(),
        full_name: fullName,
        status: 'pending', // Menunggu verifikasi Midtrans/Admin
        credits: 0,
        metadata: {
          plan_id: selectedPlan.id,
          credits_to_add: selectedPlan.credits,
          days_to_add: selectedPlan.days
        }
      }]);

      if (dbError) throw dbError;

      // 3. Info Pembayaran
      setError(`Registrasi berhasil! Silakan lakukan pembayaran paket ${selectedPlan.label}. Hubungi admin untuk aktivasi.`);
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftarkan akun.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-slate-950">
      <div className="w-full max-w-md p-8 glass rounded-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tighter text-white">SATMOKO <span className="text-cyan-400">STUDIO</span></h1>
          <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest font-bold">Secure Creative Command Center</p>
        </div>

        {error && (
          <div className={`p-4 rounded-xl text-xs font-bold text-center border ${error.includes('berhasil') ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email Address" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={loading} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95">
              {loading ? 'AUTHORIZING...' : 'LOGIN TO HUB'}
            </button>
            <button type="button" onClick={() => setMode('register')} className="w-full text-[10px] font-bold text-slate-500 hover:text-cyan-400 uppercase tracking-widest">Need a workspace? Register</button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
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
            <button onClick={executeRegistration} disabled={loading || !selectedPlan} className="w-full py-4 bg-cyan-500 text-black font-extrabold rounded-xl transition-all shadow-lg active:scale-95">
              {loading ? 'PROCESSING...' : 'CONFIRM & REGISTER'}
            </button>
            <button onClick={() => setMode('register')} className="w-full text-[10px] font-bold text-slate-500 uppercase text-center">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};
