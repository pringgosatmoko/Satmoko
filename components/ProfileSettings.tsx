
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isAdmin, deleteAccountPermanently } from '../lib/api';

interface ProfileSettingsProps {
  onBack: () => void;
  userEmail: string;
  credits: number;
  validUntil: string | null;
  lang: 'id' | 'en';
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onBack, userEmail, credits, validUntil, lang }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Sandi tidak cocok!' }); return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({ type: 'success', msg: 'Sandi Berhasil Diperbarui!' });
    setIsLoading(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({ type: 'success', msg: 'Tautan konfirmasi dikirim ke email baru!' });
    setIsLoading(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDelete = async () => {
    if (confirm("⚠️ PERINGATAN: Hapus akun Master secara permanen? Seluruh data dan kredit akan hilang selamanya.")) {
       setIsLoading(true);
       const success = await deleteAccountPermanently(userEmail);
       if (success) {
         await supabase.auth.signOut();
         window.location.reload();
       }
       setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-chevron-left"></i></button>
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Account <span className="text-cyan-400">Security</span></h2>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Satmoko Hub Configuration</p>
        </div>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-2xl text-[10px] font-black text-center uppercase border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-imagine p-8 rounded-[2.5rem] border border-white/5 space-y-6">
           <h3 className="text-xs font-black uppercase text-cyan-400 italic">Change Password</h3>
           <form onSubmit={handleUpdatePassword} className="space-y-4">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Master Password" className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none" />
              <button disabled={isLoading} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl text-[10px] tracking-widest shadow-xl">Update Password</button>
           </form>
        </section>

        <section className="glass-imagine p-8 rounded-[2.5rem] border border-white/5 space-y-6">
           <h3 className="text-xs font-black uppercase text-purple-400 italic">Access Identity</h3>
           <form onSubmit={handleUpdateEmail} className="space-y-4">
              <p className="text-[10px] text-slate-500 font-bold">Current: {userEmail}</p>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New Email Address" className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none" />
              <button disabled={isLoading} className="w-full py-4 bg-purple-600 text-white font-black uppercase rounded-xl text-[10px] tracking-widest shadow-xl">Update Email</button>
           </form>
        </section>
      </div>

      <section className="glass-imagine p-10 rounded-[2.5rem] border-2 border-red-500/10 flex flex-col items-center text-center gap-6">
         <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-2xl"><i className="fa-solid fa-triangle-exclamation"></i></div>
         <div>
            <h3 className="text-xl font-black text-white uppercase italic">Danger Zone</h3>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2 max-w-sm">Deleting your account will result in the immediate and irreversible removal of all your creative projects, credits, and identities.</p>
         </div>
         <button onClick={handleDelete} disabled={isLoading} className="px-10 py-4 border-2 border-red-500 text-red-500 font-black uppercase rounded-2xl text-[10px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all active:scale-95">
           PERMANENTLY DELETE MY HUB ACCOUNT
         </button>
      </section>
    </div>
  );
};
