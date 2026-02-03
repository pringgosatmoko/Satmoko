
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isAdmin, getAdminPassword, sendTelegramNotification, PLANS } from '../lib/api';

interface LoginFormProps { 
  onSuccess: (email: string, expiry?: string | null) => void;
  lang: 'id' | 'en';
  forcedMode?: 'login' | 'register';
}

declare const snap: any;

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, lang, forcedMode }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'summary' | 'pending'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('1B'); 
  const [error, setError] = useState('');

  useEffect(() => {
    if (forcedMode === 'register') setMode('register');
    if (forcedMode === 'login') setMode('login');
  }, [forcedMode]);

  const plan = PLANS.find(p => p.id === selectedPlan);

  const t = {
    id: {
      loginTitle: "MASUK_HUB",
      regTitle: "DAFTAR_BARU",
      summaryTitle: "RINGKASAN_KONTRAK",
      name: "NAMA LENGKAP",
      email: "EMAIL AKTIF",
      pass: "SANDI AKSES",
      submitLogin: "OTORISASI MASUK",
      submitReg: "CEK RINGKASAN",
      submitPay: "BUKA GERBANG PEMBAYARAN",
      noAccount: "BELUM PUNYA AKUN? DAFTAR",
      haveAccount: "SUDAH PUNYA AKUN? MASUK",
      edit: "EDIT DATA",
      pendingMsg: "MENUNGGU VERIFIKASI PEMBAYARAN... Akun akan aktif otomatis dalam 1-5 menit setelah Master menyelesaikan pembayaran di jendela pop-up Midtrans.",
      back: "KEMBALI KE LOGIN"
    },
    en: {
      loginTitle: "LOGIN_HUB",
      regTitle: "CREATE_ACCOUNT",
      summaryTitle: "CONTRACT_SUMMARY",
      name: "FULL NAME",
      email: "EMAIL ADDRESS",
      pass: "PASSWORD",
      submitLogin: "AUTHORIZE LOGIN",
      submitReg: "CHECK SUMMARY",
      submitPay: "OPEN PAYMENT GATEWAY",
      noAccount: "NEED AN ACCOUNT? REGISTER",
      haveAccount: "HAVE AN ACCOUNT? LOGIN",
      edit: "EDIT DATA",
      pendingMsg: "AWAITING PAYMENT VERIFICATION... Your account will activate automatically in 1-5 mins once the Midtrans pop-up payment is completed.",
      back: "BACK TO LOGIN"
    }
  }[lang];

  const handleStartPayment = async () => {
    if (typeof snap === 'undefined') {
      setError("Midtrans SDK belum terload. Silakan refresh halaman.");
      return;
    }

    setIsLoading(true);
    setError('');
    const orderId = `SAT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      // 1. Ambil Snap Token dulu untuk memastikan backend siap
      const response = await fetch('/api/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount: plan?.price, email: email.toLowerCase(), fullName })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.token) {
        throw new Error(data.error || "Gagal mendapatkan akses pembayaran dari server. Cek Konfigurasi Key Master.");
      }

      // 2. Buat Auth User (Upsert Logic)
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (authError && !authError.message.includes('already registered')) throw authError;

      // 3. Simpan Member Pending
      const { error: dbError } = await supabase.from('members').upsert([{ 
        email: email.toLowerCase(), 
        status: 'pending', 
        full_name: fullName,
        credits: 0,
        metadata: { 
          order_id: orderId, 
          plan_id: selectedPlan,
          price: plan?.price,
          credits_to_add: plan?.credits,
          days_to_add: plan?.durationDays
        }
      }], { onConflict: 'email' });
      if (dbError) throw dbError;

      sendTelegramNotification(`🔔 *REGISTRASI (PAYMENT START)*\nNama: ${fullName}\nEmail: ${email}\nOrder: ${orderId}`);

      // 4. Munculkan Pop-up Snap
      snap.pay(data.token, {
        onSuccess: () => { setMode('pending'); },
        onPending: () => { setMode('pending'); },
        onError: (result: any) => { 
          setError("Pembayaran Dibatalkan/Gagal. " + (result.status_message || "")); 
          setIsLoading(false);
        },
        onClose: () => { 
          setMode('pending'); 
          setIsLoading(false);
        }
      });

    } catch (e: any) {
      setError(e.message || "Gagal sinkronisasi data.");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      setMode('summary');
      return;
    }

    if (mode === 'login') {
      setIsLoading(true);
      try {
        if (isAdmin(email) && password === getAdminPassword()) {
          onSuccess(email, null);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        const { data: member } = await supabase.from('members').select('status, valid_until').eq('email', email.toLowerCase()).maybeSingle();
        
        if (!member || member.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error("AKUN_PENDING: Selesaikan pembayaran atau tunggu verifikasi Admin.");
        }
        onSuccess(email, member.valid_until);
      } catch (err: any) {
        setError(err.message || 'Otorisasi Gagal');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="glass-panel p-8 rounded-[2.5rem] bg-black/60 border border-white/5 shadow-2xl relative">
        <div className="mb-8 text-center">
          <h2 className="text-[11px] font-black uppercase text-cyan-500 tracking-[0.6em] italic">
            {mode === 'login' ? t.loginTitle : mode === 'summary' ? t.summaryTitle : t.regTitle}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-black uppercase italic">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
            </motion.div>
          )}
          
          {mode === 'pending' ? (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 text-center py-6">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-3xl shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                 <i className="fa-solid fa-hourglass-half animate-spin"></i>
              </div>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.2em] leading-relaxed px-4">{t.pendingMsg}</p>
              <div className="space-y-4">
                <a href="https://wa.me/6285147007574" target="_blank" className="block w-full py-5 rounded-2xl bg-green-500 text-black font-black uppercase text-[10px] tracking-widest shadow-xl">HUBUNGI ADMIN (WA)</a>
                <button onClick={() => setMode('login')} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors">{t.back}</button>
              </div>
            </motion.div>
          ) : mode === 'summary' ? (
            <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <div className="bg-white/5 border border-white/5 rounded-[1.8rem] p-7 space-y-5 shadow-inner">
                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-[9px] font-black text-slate-600 uppercase">IDENTITAS</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-[9px] font-black text-slate-600 uppercase">EMAIL_TARGET</span>
                    <span className="text-[10px] font-bold text-white lowercase">{email}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-[9px] font-black text-slate-600 uppercase">TINGKAT_AKSES</span>
                    <span className="text-[10px] font-black text-cyan-400">{plan?.label} (+{plan?.credits} CR)</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">TOTAL TAGIHAN</span>
                    <span className="text-2xl font-black text-white italic">Rp {plan?.price.toLocaleString()}</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setMode('register')} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all">{t.edit}</button>
                  <button onClick={handleStartPayment} disabled={isLoading} className="py-4 rounded-xl bg-cyan-500 text-black font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-white transition-all relative overflow-hidden">
                    {isLoading ? "HUBUNGKAN..." : t.submitPay}
                    {isLoading && <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-[loading_1s_infinite] w-full"></div>}
                  </button>
               </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <>
                  <input type="text" required placeholder={t.name} value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all shadow-inner" />
                  
                  <div className="grid grid-cols-3 gap-2">
                    {PLANS.map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        className={`py-3 rounded-xl text-[9px] font-black transition-all border flex flex-col items-center gap-1 ${selectedPlan === p.id ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-105 z-10' : 'bg-white/5 text-slate-500 border-white/5'}`}
                      >
                        <span>{p.label.split(' ')[0]}</span>
                        <span className="opacity-60 text-[7px]">Rp {p.price / 1000}k</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <input type="email" required placeholder={t.email} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all shadow-inner" />
              <input type="password" required placeholder={t.pass} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-white text-[11px] font-bold outline-none focus:border-cyan-500/30 transition-all shadow-inner" />
              
              <button type="submit" disabled={isLoading} className="w-full py-5 mt-2 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-cyan-500 transition-all shadow-xl active:scale-90 disabled:opacity-30">
                {isLoading ? "MENGEKSEKUSI_PERINTAH..." : (mode === 'register' ? t.submitReg : t.submitLogin)}
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>

      {mode !== 'summary' && mode !== 'pending' && (
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-10 text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-cyan-400 transition-colors text-center">
          {mode === 'login' ? t.noAccount : t.haveAccount}
        </button>
      )}
    </div>
  );
};
