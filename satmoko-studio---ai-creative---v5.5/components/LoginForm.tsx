
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

interface LoginFormProps { 
  onSuccess: (email: string, expiry?: string | null) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('30'); 
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getEnvValue = (key: string, fallback: string) => {
    const vEnv = (import.meta as any).env || {};
    const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
    const wEnv = (window as any).process?.env || {};
    return vEnv[key] || pEnv[key] || wEnv[key] || fallback;
  };

  const supabaseUrl = getEnvValue('VITE_DATABASE_URL', 'https://urokqoorxuiokizesiwa.supabase.co');
  const supabaseKey = getEnvValue('VITE_SUPABASE_ANON_KEY', 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isRegister) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (authError) throw authError;

        await supabase.from('members').insert([
          { 
            email: email.toLowerCase(), 
            status: 'pending',
            full_name: `${fullName} (Paket: ${selectedPlan} Hari)` 
          }
        ]);
        
        setSuccessMsg('PENDAFTARAN BERHASIL: Menunggu persetujuan Master.');
        setTimeout(() => { setIsRegister(false); setSuccessMsg(''); }, 4000);
      } else {
        const allowedEmails = getEnvValue('VITE_ADMIN_EMAILS', 'pringgosatmoko@gmail.com').split(',').map((e: string) => e.trim().toLowerCase());
        const adminPassword = getEnvValue('VITE_ADMIN_PASSWORD', 'admin7362');

        if (allowedEmails.includes(email.toLowerCase()) && password === adminPassword) {
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
          throw new Error("AKSES DITOLAK: Akun belum disetujui Admin.");
        }

        onSuccess(email, memberData.valid_until);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal melakukan verifikasi identitas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[360px] mx-auto space-y-5 px-4 pb-20">
      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-[2.5rem] border-white/5 bg-slate-900/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
            {isRegister ? 'New Link Registration' : 'Masuk Ke Studio'}
          </h2>
          <div className={`w-2 h-2 rounded-full ${isRegister ? 'bg-fuchsia-500' : 'bg-cyan-500'} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold uppercase tracking-widest leading-relaxed">
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] text-center font-bold uppercase tracking-widest leading-relaxed">
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="space-y-4">
          {isRegister && (
            <>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-700 focus:outline-none focus:border-fuchsia-500/50 transition-all text-xs" placeholder="Full Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Access Plan</label>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-cyan-500/50 transition-all text-xs cursor-pointer"
                >
                  <option value="30">30 Hari (Standar)</option>
                  <option value="90">90 Hari (Premium)</option>
                  <option value="365">1 Tahun (Elite)</option>
                </select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all text-xs" placeholder="name@email.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Access Token (Pass)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 transition-all text-xs" placeholder="••••••••" />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${isRegister ? 'bg-fuchsia-600 text-white' : 'bg-white text-black hover:bg-cyan-400'}`}>
          {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <span>{isRegister ? 'Register Node' : 'Initialize Access'}</span>}
        </button>
      </form>
      
      <div className="text-center">
        <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }} className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-cyan-400 transition-colors">
          {isRegister ? '← Back to Authentication' : 'Request Access / Register Here'}
        </button>
      </div>
    </motion.div>
  );
};
