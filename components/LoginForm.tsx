
import React, { useState } from 'react';
import { supabase, isAdmin, getAdminPassword, createMidtransToken, processMidtransTopup, logActivity } from '../lib/api';
import { motion } from 'framer-motion';

interface LoginFormProps { 
  onSuccess: (email: string) => void;
  lang: 'id' | 'en';
  initialEmail?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, lang, initialEmail }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingSummary, setIsConfirmingSummary] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('PRO1'); 
  const [error, setError] = useState('');
  const [pendingData, setPendingData] = useState<{pkg: any, email: string} | null>(null);

  const plans = [
    { id: 'FREE', label: 'FREE TRIAL (7D)', price: 0, credits: 100 },
    { id: 'PRO1', label: 'PRO 1 MONTH', price: 100000, credits: 1000 },
    { id: 'PRO3', label: 'PRO 3 MONTH', price: 250000, credits: 3500 },
    { id: 'PRO1T', label: 'PRO 1T (ULTRA)', price: 900000, credits: 15000 }
  ];

  const handlePaymentAndSignUp = async () => {
    if (!pendingData || isLoading) return;
    setIsLoading(true);
    setError('');
    
    const { pkg, email: userEmail } = pendingData;
    const emailLower = userEmail.toLowerCase().trim();
    const orderId = `SAT-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

    try {
      // 1. Buat record member dulu dengan status pending agar webhook tidak gagal cari data
      const isFree = pkg.price === 0;
      const { error: dbError } = await supabase.from('members').upsert([{ 
        email: emailLower, 
        status: isFree ? 'active' : 'pending', 
        full_name: fullName || emailLower.split('@')[0],
        credits: isFree ? 100 : 0,
        valid_until: isFree ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        metadata: { 
          plan_id: pkg.id, 
          price: pkg.price, 
          credits: pkg.credits,
          order_id: orderId,
          created_at: new Date().toISOString()
        }
      }]);

      if (dbError) throw dbError;

      // 2. Lakukan pendaftaran akun ke Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password: password,
        options: { data: { full_name: fullName } }
      });

      if (authError) {
        // Jika user sudah ada tapi belum bayar, kita biarkan saja lanjut ke login
        if (!authError.message.includes('already registered')) throw authError;
      }

      logActivity('NEW_USER_REGISTERED', `User ${emailLower} registered for plan ${pkg.id}`);

      // 3. Jika FREE, panggil sukses
      if (isFree) {
        onSuccess(emailLower);
        return;
      }

      // 4. Request Token Midtrans
      const res = await createMidtransToken(emailLower, pkg.credits, pkg.price, orderId);
      
      if (res && res.token && (window as any).snap) {
        // Update Snap Token ke Metadata (Penting agar App.tsx bisa resume jika unmounted)
        await supabase.from('members').update({
           metadata: { 
             plan_id: pkg.id, 
             price: pkg.price, 
             credits: pkg.credits, 
             order_id: orderId,
             snap_token: res.token,
             created_at: new Date().toISOString()
           }
        }).eq('email', emailLower);

        // Buka Popup
        (window as any).snap.pay(res.token, {
          onSuccess: async () => {
            await processMidtransTopup(emailLower, pkg.credits, orderId);
            onSuccess(emailLower);
          },
          onPending: () => { onSuccess(emailLower); },
          onClose: () => { onSuccess(emailLower); }
        });
      } else {
        // Jika gagal token, tetap redirect ke halaman tunggu agar bisa cek manual
        onSuccess(emailLower);
      }
    } catch (e: any) {
      setError(e.message?.toUpperCase() || "TERJADI KESALAHAN SISTEM.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    const emailLower = email.toLowerCase().trim();

    if (isRegister) {
      const pkg = plans.find(p => p.id === selectedPlanId) || plans[0];
      setPendingData({ pkg, email: emailLower });
      setIsConfirmingSummary(true);
    } else {
      setIsLoading(true);
      try {
        if (isAdmin(emailLower) && password === getAdminPassword()) {
          logActivity('ADMIN_LOGIN', `Admin pringgo logged in`);
          onSuccess(emailLower);
          return;
        }
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: emailLower, password });
        if (loginError) throw new Error("EMAIL ATAU SANDI SALAH.");
        logActivity('USER_LOGIN', `User ${emailLower} logged in`);
        onSuccess(emailLower);
      } catch (err: any) {
        setError(err.message?.toUpperCase());
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full bg-[#0d1117]/80 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl backdrop-blur-3xl relative overflow-hidden">
      {isLoading && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-cyan-500 text-3xl"></i></div>}

      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-8">
        {isConfirmingSummary ? "ORDER SUMMARY" : (isRegister ? "STUDIO REGISTRATION" : "SECURE AUTHORIZATION")}
      </h2>

      {isConfirmingSummary && pendingData ? (
        <div className="space-y-6">
           <div className="p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-3xl space-y-3">
              <div className="flex justify-between text-xs"><span className="text-slate-500">PAKET:</span><span className="text-white font-bold">{pendingData.pkg.label}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">KREDIT:</span><span className="text-cyan-400 font-bold">{pendingData.pkg.credits} CR</span></div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-end"><span className="text-xs font-bold uppercase">TOTAL BAYAR</span><span className="text-2xl font-black text-cyan-400">Rp {pendingData.pkg.price.toLocaleString()}</span></div>
           </div>
           
           <button onClick={handlePaymentAndSignUp} className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl text-[10px] shadow-lg active:scale-95">
             DAFTAR & BAYAR SEKARANG
           </button>
           <button onClick={() => setIsConfirmingSummary(false)} className="w-full text-[9px] font-bold text-slate-600 uppercase">KEMBALI KE FORM</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <>
              <input type="text" required placeholder="NAMA LENGKAP" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 text-white text-[11px] font-bold outline-none focus:border-cyan-500/50 shadow-inner" />
              <div className="grid grid-cols-2 gap-3">
                {plans.map(p => ( 
                  <button key={p.id} type="button" onClick={() => setSelectedPlanId(p.id)} className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedPlanId === p.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5 opacity-40'}`}>
                    <p className="text-[9px] font-black text-white uppercase">{p.label}</p>
                    <p className="text-[10px] font-black text-cyan-400">{p.price === 0 ? 'FREE' : `Rp ${p.price/1000}k`}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          <input type="email" required placeholder="EMAIL MASTER" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 text-white text-[11px] font-bold outline-none focus:border-cyan-500/50 shadow-inner" />
          <input type="password" required placeholder="SANDI AKSES" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 text-white text-[11px] font-bold outline-none focus:border-cyan-500/50 shadow-inner" />
          
          {error && <p className="text-[9px] text-red-500 font-black uppercase text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
          
          <button type="submit" className="w-full py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-widest shadow-xl active:scale-95">
            {isRegister ? "LIHAT RINGKASAN ORDER" : "MASUK KE STUDIO"}
          </button>
          
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="w-full text-[9px] font-bold text-slate-700 uppercase py-2">
            {isRegister ? "SUDAH PUNYA AKUN? LOGIN" : "BELUM PUNYA AKUN? DAFTAR"}
          </button>
        </form>
      )}
    </div>
  );
};
