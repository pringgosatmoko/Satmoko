
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/api';

interface ProfileSettingsProps {
  onBack: () => void;
  onLogout?: () => void;
  credits: number;
  validUntil: string | null;
  lang: 'id' | 'en';
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onBack, onLogout, credits, validUntil, lang }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      if (!validUntil) {
        setCountdown(lang === 'id' ? 'AKUN TIDAK AKTIF' : 'INACTIVE ACCOUNT');
        return;
      }

      const expiry = new Date(validUntil).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown(lang === 'id' ? 'MASA AKTIF HABIS' : 'MEMBERSHIP EXPIRED');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days}D ${hours}H ${minutes}M ${seconds}S`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [validUntil, lang]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setStatus({ type: 'error', msg: 'Password tidak cocok!' });
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setStatus(error ? { type: 'error', msg: error.message } : { type: 'success', msg: 'Password diperbarui!' });
    setIsLoading(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setStatus(error ? { type: 'error', msg: error.message } : { type: 'success', msg: 'Konfirmasi terkirim ke email baru!' });
    setIsLoading(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const t = {
    id: {
      accountStatus: "Status Keanggotaan",
      balance: "Saldo Kredit",
      expiry: "Masa Aktif",
      security: "Pusat Keamanan",
      masterPass: "Master Password",
      emailSync: "Sinkronisasi Email",
      update: "SIMPAN PERUBAHAN",
      processing: "MEMPROSES...",
      idBadge: "Identitas Digital Master"
    },
    en: {
      accountStatus: "Membership Status",
      balance: "Credit Balance",
      expiry: "Expiration",
      security: "Security Hub",
      masterPass: "Master Password",
      emailSync: "Email Synchronization",
      update: "SAVE CHANGES",
      processing: "PROCESSING...",
      idBadge: "Master Digital Identity"
    }
  }[lang];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Minimalist */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{t.security}</h2>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">Version 5.4.2 Encryption</p>
          </div>
        </div>
        <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-slate-600'}`}>
          <i className="fa-solid fa-fingerprint"></i>
        </button>
      </div>

      {/* Account Info Bar - Minimal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-3xl bg-slate-900/40 border-white/5 flex items-center justify-between group">
           <div className="space-y-1">
             <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest leading-none">{t.balance}</p>
             <h3 className="text-2xl font-black italic text-white leading-none">
               {credits.toLocaleString()} <span className="text-[9px] text-cyan-500 not-italic font-black ml-1 tracking-widest">CR</span>
             </h3>
           </div>
           <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-cyan-400 transition-colors">
             <i className="fa-solid fa-bolt-lightning text-xs"></i>
           </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl bg-slate-900/40 border-white/5 flex items-center justify-between group">
           <div className="space-y-1">
             <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest leading-none">{t.expiry}</p>
             <h3 className="text-xl font-black text-white font-mono leading-none tracking-tight uppercase">
               {countdown}
             </h3>
           </div>
           <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-fuchsia-400 transition-colors">
             <i className="fa-solid fa-hourglass-half text-xs"></i>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-2xl border text-[9px] font-black text-center uppercase tracking-widest ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Security Console */}
      <div className="glass-panel rounded-[2.5rem] bg-[#0d1117]/60 border-white/5 overflow-hidden">
        <div className="bg-white/5 px-8 py-4 border-b border-white/5">
           <p className="text-[9px] font-black uppercase text-cyan-500 tracking-[0.4em] italic">{t.idBadge}</p>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Password Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">{t.masterPass}</h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Sandi Baru" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-500/30 transition-all shadow-inner" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Konfirmasi Sandi" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-500/30 transition-all shadow-inner" />
              <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 bg-white text-black font-black uppercase rounded-2xl hover:bg-cyan-500 transition-all text-[9px] tracking-[0.2em] active:scale-95 disabled:opacity-20 shadow-xl">
                {isLoading ? t.processing : t.update}
              </button>
            </form>
          </div>

          {/* Email Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#d946ef]"></span>
              <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400">{t.emailSync}</h3>
            </div>
            <form onSubmit={handleUpdateEmail} className="space-y-3">
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email Baru Master" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-[11px] font-bold text-white focus:outline-none focus:border-fuchsia-500/30 transition-all shadow-inner" />
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] text-slate-500 font-bold leading-relaxed italic">
                 Master, harap pastikan email baru dapat diakses untuk verifikasi perubahan node identitas.
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 bg-white text-black font-black uppercase rounded-2xl hover:bg-fuchsia-400 transition-all text-[9px] tracking-[0.2em] active:scale-95 disabled:opacity-20 shadow-xl">
                {isLoading ? t.processing : t.update}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="bg-black/40 px-8 py-4 border-t border-white/5 flex items-center justify-between">
           <p className="text-[7px] font-black text-slate-700 uppercase tracking-widest">Protocol: SATMOKO_SEC_P256</p>
           <p className="text-[7px] font-black text-slate-700 uppercase tracking-widest">Node Status: Protected</p>
        </div>
      </div>
    </div>
  );
};
