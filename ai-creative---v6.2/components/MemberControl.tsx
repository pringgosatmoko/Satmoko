
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Fixed: Removed getSlotStatus as it is not exported from lib/api and not used in this component.
import { supabase, getActiveApiKey, isUserOnline, topupCredits } from '../lib/api';

interface Member {
  id: string | number;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive' | 'pending';
  valid_until?: string | null;
  created_at: string;
  last_seen?: string | null;
  credits: number;
}

interface MemberControlProps {
  onBack: () => void;
  lang: 'id' | 'en';
}

const getDaysRemaining = (validUntil: string | null | undefined, t: any) => {
  if (!validUntil) return t.expired;
  const now = new Date();
  const expiry = new Date(validUntil);
  if (expiry <= now) return t.expired;
  const diffTime = Math.abs(expiry.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays}${t.days}`;
};

export const MemberControl: React.FC<MemberControlProps> = ({ onBack, lang }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'health' | 'security'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [dbStatus, setDbStatus] = useState<'Normal' | 'Error' | 'Checking'>('Checking');
  const [aiStatus, setAiStatus] = useState<'Normal' | 'Limit' | 'Checking'>('Checking');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCredits, setEditCredits] = useState<number>(0);
  const [showGuide, setShowGuide] = useState(false);

  const t = {
    id: {
      title: "Kontrol Member",
      subtitle: "Daftar Pengguna Aktif",
      nodes: "MEMBER",
      health: "SERVER",
      keys: "KUNCI AI",
      search: "Cari member...",
      expired: "HABIS",
      days: " Hari Lagi",
      activate: "AKTIFKAN",
      deactivate: "MATIKAN",
      editTitle: "Ubah Identitas",
      apply: "Simpan Sekarang",
      abort: "Batal",
      add30: "+30 Hari",
      add90: "+90 Hari",
      add365: "+1 Tahun",
      db: "DATABASE",
      ai: "SISTEM AI",
      online: "AKTIF",
      offline: "OFFLINE",
      delConfirm: "Hapus member ini?",
      guide: "Kelola member dan kredit mereka.",
      guideTitle: "ADMINISTRASI",
      credits: "Kredit"
    },
    en: {
      title: "Membership Administration",
      subtitle: "Authenticated User Registry",
      nodes: "USERS",
      health: "INFRASTRUCTURE",
      keys: "AI LICENSING",
      search: "Filter by identity...",
      expired: "EXPIRED",
      days: " Days Remaining",
      activate: "AUTHORIZE",
      deactivate: "TERMINATE",
      editTitle: "Identity Modification",
      apply: "Commit Changes",
      abort: "Cancel Action",
      add30: "+30 Days",
      add90: "+90 Days",
      add365: "+1 Year",
      db: "DATA REPOSITORY",
      ai: "AI CORE MODULE",
      online: "ONLINE",
      offline: "OFFLINE",
      delConfirm: "Delete this member?",
      guide: "Manage users and their credit balance.",
      guideTitle: "ADMIN CONSOLE",
      credits: "Credits"
    }
  }[lang];

  useEffect(() => {
    fetchMembers();
    checkHealth();
    const presenceTimer = setInterval(fetchMembers, 10000);
    return () => clearInterval(presenceTimer);
  }, []);

  const checkHealth = async () => {
    try {
      const { error } = await supabase.from('members').select('id').limit(1);
      setDbStatus(error ? 'Error' : 'Normal');
    } catch { setDbStatus('Error'); }
    setAiStatus(getActiveApiKey() ? 'Normal' : 'Limit');
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*');
    if (data) setMembers([...data].sort((a, b) => (new Date(b.last_seen || 0).getTime()) - (new Date(a.last_seen || 0).getTime())));
  };

  const updateMemberStatus = async (id: string | number, status: 'active' | 'inactive') => {
    const validUntil = status === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase.from('members').update({ status, valid_until: validUntil }).eq('id', id);
    fetchMembers();
  };

  const addDaysToSubscription = async (id: string | number, currentValidUntil: string | null | undefined, days: number) => {
    const now = new Date();
    let startDate = (currentValidUntil && new Date(currentValidUntil) > now) ? new Date(currentValidUntil) : now;
    const newDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    await supabase.from('members').update({ valid_until: newDate.toISOString(), status: 'active' }).eq('id', id);
    fetchMembers();
  };

  const handleUpdateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const updateData: any = { 
      email: editEmail.toLowerCase(),
      credits: editCredits
    };
    if (editPassword) updateData.password = editPassword; 
    await supabase.from('members').update(updateData).eq('id', editingMember.id);
    setEditingMember(null);
    fetchMembers();
  };

  const quickTopup = async (email: string, amount: number) => {
    await topupCredits(email, amount);
    fetchMembers();
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl"><i className="fa-solid fa-chevron-left"></i></button>
          <button onClick={() => setShowGuide(!showGuide)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-xl ${showGuide ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 border-white/5 text-cyan-400'}`}>
            <i className={`fa-solid ${showGuide ? 'fa-xmark' : 'fa-question'} text-[10px]`}></i>
          </button>
          <div><h2 className="text-2xl font-black italic uppercase tracking-tighter">{t.title}</h2><p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">{t.subtitle}</p></div>
        </div>
        <div className="flex bg-black/60 p-1 rounded-2xl border border-white/5 shadow-lg">
          <button onClick={() => setActiveTab('members')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'members' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>{t.nodes}</button>
          <button onClick={() => setActiveTab('health')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'health' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>{t.health}</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'members' && (
          <motion.div key="mem" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-[11px] text-white outline-none focus:border-cyan-500/30 shadow-inner" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase())).map(m => {
                const online = isUserOnline(m.last_seen);
                const expired = getDaysRemaining(m.valid_until, t) === t.expired;
                return (
                  <div key={m.id} className="glass-panel p-6 rounded-[2rem] bg-[#0d1117] border border-white/5 shadow-2xl group transition-all hover:border-cyan-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border transition-all ${online ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-white/5 text-slate-700'}`}>{m.email.charAt(0).toUpperCase()}</div>
                        <div>
                           <h4 className="text-xs font-black text-white uppercase tracking-tight">{m.full_name || 'MEMBER'}</h4>
                           <p className="text-[8px] text-slate-600 font-mono tracking-wider">{m.email}</p>
                           <p className="text-[10px] font-black text-cyan-400 mt-1 italic">{m.credits?.toLocaleString() || 0} CR</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${online ? 'text-green-500 bg-green-500/10 border border-green-500/20' : 'text-slate-600 bg-slate-900'}`}>{online ? t.online : t.offline}</span>
                        <p className={`text-[9px] font-black mt-1 ${expired ? 'text-red-500' : 'text-cyan-500'}`}>{getDaysRemaining(m.valid_until, t)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 mb-4">
                       <button onClick={() => quickTopup(m.email, 100)} className="py-2 bg-white/5 rounded-lg text-[8px] font-black text-cyan-500 hover:bg-cyan-500 hover:text-black">+100</button>
                       <button onClick={() => quickTopup(m.email, 500)} className="py-2 bg-white/5 rounded-lg text-[8px] font-black text-cyan-500 hover:bg-cyan-500 hover:text-black">+500</button>
                       <button onClick={() => quickTopup(m.email, 1000)} className="py-2 bg-white/5 rounded-lg text-[8px] font-black text-cyan-500 hover:bg-cyan-500 hover:text-black">+1K</button>
                       <button onClick={() => quickTopup(m.email, 5000)} className="py-2 bg-white/5 rounded-lg text-[8px] font-black text-cyan-500 hover:bg-cyan-500 hover:text-black">+5K</button>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingMember(m); setEditEmail(m.email); setEditCredits(m.credits || 0); }} className="w-9 h-9 rounded-xl bg-white/5 text-slate-500 hover:text-cyan-400 flex items-center justify-center"><i className="fa-solid fa-user-shield text-[10px]"></i></button>
                        <button onClick={() => { if(confirm(t.delConfirm)) supabase.from('members').delete().eq('id', m.id).then(fetchMembers); }} className="w-9 h-9 rounded-xl bg-white/5 text-slate-500 hover:text-red-500 flex items-center justify-center"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                      </div>
                      <button onClick={() => updateMemberStatus(m.id, m.status === 'active' ? 'inactive' : 'active')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-lg ${m.status === 'active' ? 'text-red-500 bg-red-500/10' : 'text-black bg-cyan-500'}`}>
                        {m.status === 'active' ? t.deactivate : t.activate}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'health' && (
          <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard title={t.db} status={dbStatus} color={dbStatus === 'Normal' ? 'cyan' : 'red'} icon="fa-database" />
            <StatusCard title={t.ai} status={aiStatus} color={aiStatus === 'Normal' ? 'cyan' : 'red'} icon="fa-brain" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="glass-panel w-full max-w-sm p-8 rounded-[2.5rem] bg-[#0d1117] border-white/10 shadow-2xl">
              <h3 className="text-xl font-black italic uppercase text-white mb-8">{t.editTitle}</h3>
              <form onSubmit={handleUpdateIdentity} className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">Email</label>
                   <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">{t.credits}</label>
                   <input type="number" value={editCredits} onChange={e => setEditCredits(parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">Password Baru (Opsional)</label>
                   <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white" placeholder="••••••••" />
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <button type="submit" className="w-full py-4 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase shadow-xl hover:bg-white transition-all">{t.apply}</button>
                  <button type="button" onClick={() => setEditingMember(null)} className="w-full py-4 rounded-2xl border border-white/5 text-slate-600 text-[10px] font-black uppercase hover:bg-white/5 transition-all">{t.abort}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusCard = ({ title, status, color, icon }: any) => (
  <div className="glass-panel p-8 rounded-[2.5rem] flex items-center justify-between border-white/5 bg-slate-900/40 shadow-2xl group transition-all hover:border-white/10">
    <div><p className="text-[8px] font-black uppercase text-slate-600 mb-2 tracking-[0.2em]">{title}</p><h3 className={`text-2xl font-black italic tracking-tighter ${color === 'cyan' ? 'text-cyan-400' : 'text-red-500'}`}>{status}</h3></div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}><i className={`fa-solid ${icon} text-xl`}></i></div>
  </div>
);
