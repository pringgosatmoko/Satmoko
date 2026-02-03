
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isAdmin, getAdminPassword } from '../lib/api';

interface LoginFormProps { 
  onSuccess: (email: string, expiry?: string | null) => void;
  lang: 'id' | 'en';
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, lang }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('1 Bulan'); 
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const plans = [
    { label: '1 Bulan', en: '1 Month' },
    { label: '3 Bulan', en: '3 Months' },
    { label: '1 Tahun', en: '1 Year' }
  ];

  const t = {
    id: {
      loginTitle: "MASUK KE SISTEM",
      regTitle: "DAFTAR AKUN BARU",
      name: "Nama Lengkap",
      email: "Email Akun",
      pass: "Sandi",
      plan: "Pilih Durasi Langganan",
      submitLogin: "MASUK SEKARANG",
      submitReg: "KIRIM PENDAFTARAN",
      noAccount: "BELUM PUNYA AKUN? DAFTAR",
      haveAccount: "SUDAH PUNYA AKUN? LOGIN",
      regSuccess: "DAFTAR BERHASIL: Menunggu persetujuan admin.",
      contactAdmin: "HUBUNGI ADMIN",
      back: "KEMBALI KE LOGIN"
    },
    en: {
      loginTitle: "SYSTEM AUTHENTICATION",
      regTitle: "NODE REGISTRATION",
      name: "Full Name",
      email: "Account Email",
      pass: "Access Key",
      plan: "Subscription Period",
      submitLogin: "INITIALIZE ACCESS",
      submitReg: "REQUEST REGISTRATION",
      noAccount: "NEED ACCESS? REGISTER HERE",
      haveAccount: "EXISTING ACCOUNT? SIGN IN",
      regSuccess: "REGISTRATION SUCCESS: Pending administrative approval.",
      contactAdmin: "CONTACT ADMINISTRATION",
      back: "RETURN TO AUTHENTICATION"
    }
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isRegister) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (authError) throw authError;

        // Menyimpan permintaan durasi di full_name agar admin tahu
        await supabase.from('members').insert([{ 
          email: email.toLowerCase(), 
          status: 'pending', 
          full_name: `${fullName} (${selectedPlan})`,
          credits: 1000 
        }]);
        
        setSuccessMsg(t.regSuccess);
      } else {
        if (isAdmin(email) && password === getAdminPassword()) {
          onSuccess(email, null);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('status, valid_until')
          .eq('email', email.toLowerCase())
          .single();

        if (memberError || !memberData || memberData.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error(lang === 'id' ? "AKSES DITOLAK: Akun belum aktif." : "ACCESS DENIED: Account inactive or expired.");
        }
        onSuccess(email, memberData.valid_until);
      }
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="glass-panel p-8 rounded-[2.5rem] bg-[#0d1117]/90 border-white/5 shadow-2xl relative overflow-hidden">
        <div className="mb-8 flex flex-col items-center">
          <h2 className="text-sm font-black uppercase text-white tracking-[0.4em] italic text-center">
            {isRegister ? t.regTitle : t.loginTitle}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold uppercase">
              {error}
            </motion.div>
          )}
          
          {successMsg ? (
            <div className="space-y-6 text-center py-4">
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest leading-relaxed">{successMsg}</p>
              <div className="pt-4 space-y-3">
                <a href="https://t.me/pringgosatmoko" target="_blank" className="block w-full py-4 rounded-xl bg-cyan-500 text-black font-black uppercase text-[10px] tracking-widest">{t.contactAdmin}</a>
                <button onClick={() => setSuccessMsg('')} className="text-[9px] font-black uppercase text-slate-500 hover:text-white">{t.back}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-600 px-3 tracking-widest">{t.name}</label>
                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-white text-[11px] outline-none focus:border-cyan-500/30" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-600 px-3 tracking-widest">{t.plan}</label>
                    <div className="grid grid-cols-3 gap-2 px-1">
                      {plans.map(p => (
                        <button 
                          key={p.label}
                          type="button"
                          onClick={() => setSelectedPlan(p.label)}
                          className={`py-3 rounded-xl text-[9px] font-black transition-all border ${selectedPlan === p.label ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg' : 'bg-black/40 text-slate-600 border-white/5 hover:border-white/10'}`}
                        >
                          {lang === 'id' ? p.label : p.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-600 px-3 tracking-widest">{t.email}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-white text-[11px] outline-none focus:border-cyan-500/30" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-600 px-3 tracking-widest">{t.pass}</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-white text-[11px] outline-none focus:border-cyan-500/30" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-5 mt-4 rounded-2xl bg-cyan-500 text-black font-black uppercase text-[11px] tracking-widest shadow-xl transition-all hover:bg-white active:scale-95">
                {isLoading ? "..." : (isRegister ? t.submitReg : t.submitLogin)}
              </button>
            </form>
          )}
        </AnimatePresence>
      </div>
      {!successMsg && (
        <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-cyan-400">
          {isRegister ? t.haveAccount : t.noAccount}
        </button>
      )}
    </div>
  );
};
