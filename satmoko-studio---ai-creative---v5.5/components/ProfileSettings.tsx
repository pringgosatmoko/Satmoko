
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

      setCountdown(`${days}D : ${hours}H : ${minutes}M : ${seconds}S`);
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
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setStatus(error ? { type: 'error', msg: error.message } : { type: 'success', msg: 'Konfirmasi telah dikirim ke email baru!' });
    setIsLoading(false);
  };

  const t = {
    id: {
      accountStatus: "Status Keanggotaan",
      balance: "Saldo Kredit",
      expiry: "Masa Aktif Berakhir",
      countdown: "Hitung Mundur Sisa Waktu",
      security: "Pusat Keamanan",
      masterPass: "Master Password",
      emailSync: "Sinkronisasi Email",
      update: "Simpan Perubahan",
      processing: "Proses..."
    },
    en: {
      accountStatus: "Membership Status",
      balance: "Credit Balance",
      expiry: "Membership Expiration",
      countdown: "Time Remaining Countdown",
      security: "Security Hub",
      masterPass: "Master Password",
      emailSync: "Email Synchronization",
      update: "Save Changes",
      processing: "Processing..."
    }
  }[lang];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-chevron-left"></i></button>
        <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center ${showGuide ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_#22d3ee]' : 'bg-white/5 border-white/5 text-cyan-400'}`}><i className="fa-solid fa-circle-question"></i></button>
        <h2 className="text-2xl font-black italic uppercase italic tracking-tighter">{t.security}</h2>
      </div>

      {/* Account Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-8 rounded-[3rem] bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <i className="fa-solid fa-bolt-lightning text-7xl"></i>
          </div>
          <p className="text-[9px] font-black uppercase text-cyan-500 tracking-[0.4em] mb-4">{t.balance}</p>
          <h3 className="text-5xl font-black italic text-white tracking-tighter leading-none mb-2">
            {credits.toLocaleString()} <span className="text-sm not-italic uppercase text-slate-600">CR</span>
          </h3>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Neural Currency Active</p>
        </div>

        <div className="glass-panel p-8 rounded-[3rem] bg-gradient-to-br from-fuchsia-500/10 to-transparent border-fuchsia-500/20 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <i className="fa-solid fa-hourglass-half text-7xl"></i>
          </div>
          <p className="text-[9px] font-black uppercase text-fuchsia-400 tracking-[0.4em] mb-4">{t.expiry}</p>
          <h3 className="text-3xl font-black italic text-white tracking-tighter leading-none mb-3 font-mono">
            {countdown}
          </h3>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">
            {validUntil ? new Date(validUntil).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No Expiry Data'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-2xl border ${status.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'} text-xs font-bold text-center uppercase tracking-widest`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white/5 bg-slate-900/40">
          <div className="flex items-center gap-3"><i className="fa-solid fa-key text-cyan-400"></i><h3 className="text-sm font-black uppercase italic tracking-widest">{t.masterPass}</h3></div>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Sandi Baru" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Konfirmasi Sandi" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50" />
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-cyan-400 transition-all text-[10px] tracking-widest active:scale-95">{isLoading ? t.processing : t.update}</button>
          </form>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white/5 bg-slate-900/40">
          <div className="flex items-center gap-3"><i className="fa-solid fa-envelope text-fuchsia-400"></i><h3 className="text-sm font-black uppercase italic tracking-widest">{t.emailSync}</h3></div>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Master Email Baru" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:outline-none focus:border-fuchsia-500/50" />
            <button type="submit" disabled={isLoading} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:bg-fuchsia-400 transition-all text-[10px] tracking-widest active:scale-95">{isLoading ? t.processing : t.update}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
