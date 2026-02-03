
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  id: string | number;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive' | 'pending';
  valid_until?: string | null;
  created_at: string;
}

interface MemberControlProps {
  onBack: () => void;
  onChatUser?: (email: string) => void;
}

export const MemberControl: React.FC<MemberControlProps> = ({ onBack, onChatUser }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'health'>('all');
  const [actionId, setActionId] = useState<string | number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram States
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [isSavingTg, setIsSavingTg] = useState(false);

  const getEnv = (key: string) => {
    const vEnv = (import.meta as any).env || {};
    const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
    const wEnv = (window as any).process?.env || {};
    const fallbacks: Record<string, string> = {
      'VITE_DATABASE_URL': 'https://urokqoorxuiokizesiwa.supabase.co',
      'VITE_SUPABASE_ANON_KEY': 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8'
    };
    return vEnv[key] || pEnv[key] || wEnv[key] || fallbacks[key] || "";
  };

  const supabase = useMemo(() => {
    return createClient(getEnv('VITE_DATABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));
  }, []);

  useEffect(() => {
    fetchMembers();
    measureLatency();
    fetchTelegramConfigs();
  }, []);

  const fetchTelegramConfigs = async () => {
    try {
      const { data } = await supabase.from('system_configs').select('*');
      if (data) {
        const token = data.find(c => c.key === 'telegram_bot_token')?.value || '';
        const chatId = data.find(c => c.key === 'telegram_chat_id')?.value || '';
        setTgToken(token);
        setTgChatId(chatId);
      }
    } catch (e) { console.warn("Config fetch issue"); }
  };

  const saveTelegramConfigs = async () => {
    setIsSavingTg(true);
    try {
      await supabase.from('system_configs').upsert({ key: 'telegram_bot_token', value: tgToken });
      await supabase.from('system_configs').upsert({ key: 'telegram_chat_id', value: tgChatId });
      alert("Telegram Configuration Synced Successfully!");
    } catch (e: any) { alert("Save Error: " + e.message); }
    finally { setIsSavingTg(false); }
  };

  const testTelegram = async () => {
    if (!tgToken || !tgChatId) return alert("Isi token dan Chat ID dulu, Bolo!");
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: "<b>SATMOKO STUDIO BRIDGE:</b> Connection Test Successful! 🦾🚀",
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      if (data.ok) alert("Pesan terkirim ke Telegram!");
      else alert("Telegram Error: " + data.description);
    } catch (e: any) { alert("Fetch Error: " + e.message); }
  };

  const measureLatency = async () => {
    const start = performance.now();
    try {
      await supabase.from('members').select('id').limit(1);
      setLatency(Math.round(performance.now() - start));
    } catch (e) { setLatency(-1); }
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (e: any) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleAction = async (id: string | number, type: 'approve' | 'extend' | 'delete', currentData?: any) => {
    setActionId(id);
    try {
      if (type === 'delete') {
        if (!confirm(`Hapus permanen akses ${currentData?.email}?`)) return;
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;
      } else {
        let days = 30;
        if (type === 'approve') {
          if (currentData?.full_name?.includes("90 Hari")) days = 90;
          if (currentData?.full_name?.includes("365 Hari")) days = 365;
        }
        const now = new Date();
        const currentValid = currentData?.valid_until ? new Date(currentData.valid_until) : now;
        const baseDate = currentValid < now ? now : currentValid;
        const newExpiry = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000));
        const { error } = await supabase.from('members').update({ valid_until: newExpiry.toISOString(), status: 'active' }).eq('id', id);
        if (error) throw error;
      }
      await fetchMembers();
    } catch (e: any) { alert("ERROR DATABASE: " + e.message); } finally { setActionId(null); }
  };

  const downloadBackupJSON = () => {
    const dataStr = JSON.stringify(members, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Satmoko_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Email', 'Full Name', 'Status', 'Registered At', 'Valid Until'];
    const rows = members.map(m => [
      m.id,
      m.email,
      `"${(m.full_name || '').replace(/"/g, '""')}"`,
      m.status,
      m.created_at,
      m.valid_until || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Satmoko_Members_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const restoredData = JSON.parse(event.target?.result as string);
        if (!Array.isArray(restoredData)) throw new Error("Format data tidak valid (Must be array)");
        if (!confirm(`Konfirmasi: Timpa/Pulihkan ${restoredData.length} data member?`)) return;
        setIsLoading(true);
        for (const item of restoredData) {
          const { error } = await supabase.from('members').upsert({
            email: item.email,
            full_name: item.full_name,
            status: item.status,
            valid_until: item.valid_until,
            created_at: item.created_at
          }, { onConflict: 'email' });
          if (error) console.warn("Upsert failed for:", item.email, error.message);
        }
        await fetchMembers();
        alert("Restore Database Selesai.");
      } catch (err: any) { alert("Gagal Restore: " + err.message); } finally { setIsLoading(false); }
    };
    reader.readAsText(file);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'pending' && m.status === 'pending') || (activeTab === 'active' && m.status === 'active');
    return matchesSearch && (activeTab !== 'health' ? matchesTab : false);
  });

  const getStatusInfo = (m: Member) => {
    if (m.status === 'pending') return { color: 'bg-yellow-500', label: 'Waiting' };
    if (m.valid_until && new Date(m.valid_until) < new Date()) return { color: 'bg-red-500', label: 'Expired' };
    return { color: 'bg-cyan-500', label: 'Active' };
  };

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return "---";
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
            <i className="fa-solid fa-arrow-left text-xs text-slate-500"></i>
          </button>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar no-scrollbar">
            <TabBtn active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" count={members.length} />
            <TabBtn active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="Pending" count={members.filter(m => m.status === 'pending').length} color="yellow" />
            <TabBtn active={activeTab === 'active'} onClick={() => setActiveTab('active')} label="Active" count={members.filter(m => m.status === 'active').length} color="cyan" />
            <TabBtn active={activeTab === 'health'} onClick={() => setActiveTab('health')} label="System" icon="fa-gears" color="fuchsia" />
          </div>
        </div>
        {activeTab !== 'health' && (
          <div className="flex-1 relative group w-full">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600"></i>
            <input type="text" placeholder="Search identity node..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-500/50 transition-all text-white font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}
        <button onClick={() => { fetchMembers(); measureLatency(); }} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5"><i className={`fa-solid fa-rotate text-xs text-slate-500 ${isLoading ? 'fa-spin' : ''}`}></i></button>
      </div>

      <div className="flex-1 glass-panel rounded-[2.5rem] overflow-hidden flex flex-col bg-slate-900/20 border-white/5 shadow-2xl relative">
        <AnimatePresence mode="wait">
          {activeTab === 'health' ? (
            <motion.div key="health-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-8 overflow-y-auto h-full custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Database Panel */}
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fa-solid fa-database text-cyan-500"></i> Database Operations</h3>
                    <div className="grid grid-cols-1 gap-3">
                       <button onClick={downloadBackupJSON} className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><i className="fa-solid fa-download text-cyan-500"></i> Backup Database (JSON)</button>
                       <button onClick={downloadCSV} className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><i className="fa-solid fa-file-csv text-green-500"></i> Export to CSV</button>
                       <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3"><i className="fa-solid fa-upload text-fuchsia-500"></i> Restore Database (JSON)</button>
                       <input type="file" ref={fileInputRef} onChange={handleRestoreJSON} accept=".json" className="hidden" />
                    </div>
                 </div>

                 {/* Telegram Config Panel */}
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fa-brands fa-telegram text-blue-400"></i> Telegram Bridge Config</h3>
                    <div className="space-y-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-600 uppercase ml-1">Bot Token</label>
                          <input type="password" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="Enter Token..." className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-[10px] text-white focus:outline-none focus:border-blue-500/50" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-600 uppercase ml-1">Admin Chat ID</label>
                          <input type="text" value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="e.g. 12345678" className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-[10px] text-white focus:outline-none focus:border-blue-500/50" />
                       </div>
                       <div className="flex gap-2">
                          <button onClick={saveTelegramConfigs} disabled={isSavingTg} className="flex-1 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                             {isSavingTg ? 'Syncing...' : 'Save Config'}
                          </button>
                          <button onClick={testTelegram} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all text-[9px] font-black uppercase"><i className="fa-solid fa-paper-plane"></i></button>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><i className="fa-solid fa-bolt text-fuchsia-500"></i> System Stats</h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 uppercase">Ping</span><span className="text-xl font-black text-cyan-400">{latency || '--'} ms</span></div>
                       <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 uppercase">Nodes</span><span className="text-xl font-black text-white">{members.length}</span></div>
                    </div>
                 </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {filteredMembers.length > 0 ? filteredMembers.map(m => {
                const info = getStatusInfo(m);
                const isProcessing = actionId === m.id;
                return (
                  <motion.div key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2 px-6 py-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all flex flex-wrap lg:flex-nowrap items-center gap-4 group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${info.color}`}></div>
                    <div className="flex-1 min-w-[200px]">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate">{m.full_name || 'Anonymous Node'}</h4>
                      <p className="text-[8px] text-slate-500 font-mono truncate italic">{m.email}</p>
                    </div>
                    <div className="flex gap-8">
                       <div className="flex flex-col"><span className="text-[7px] font-black text-slate-700 uppercase mb-1">Registered</span><span className="text-[9px] font-bold text-slate-400">{formatTime(m.created_at)}</span></div>
                       <div className="flex flex-col"><span className="text-[7px] font-black text-slate-700 uppercase mb-1">Expires</span><span className={`text-[9px] font-bold ${info.label === 'Expired' ? 'text-red-500' : 'text-cyan-500'}`}>{formatTime(m.valid_until)}</span></div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                       {onChatUser && <button onClick={() => onChatUser(m.email)} className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all border border-cyan-500/20"><i className="fa-solid fa-comment-dots text-xs"></i></button>}
                       {m.status === 'pending' ? <button onClick={() => handleAction(m.id, 'approve', m)} className="h-10 px-5 rounded-xl bg-cyan-500 text-black font-black text-[9px] uppercase tracking-widest shadow-lg">Approve</button> : <button onClick={() => handleAction(m.id, 'extend', m)} className="w-10 h-10 rounded-xl bg-white/5 text-slate-500 border border-white/5 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all" title="+30 Days"><i className="fa-solid fa-clock-rotate-left text-xs"></i></button>}
                       <button onClick={() => handleAction(m.id, 'delete', m)} className="w-10 h-10 rounded-xl text-slate-700 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                  </motion.div>
                );
              }) : <div className="h-full flex flex-col items-center justify-center py-20 opacity-10"><i className="fa-solid fa-box-open text-4xl mb-4"></i><p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Cluster</p></div>}
            </div>
          )}
        </AnimatePresence>
        <div className="px-8 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center text-[8px] font-black text-slate-700 uppercase tracking-widest">
           <span>DB Connection: OK</span>
           <span>Satmoko Studio Admin v2.1</span>
        </div>
      </div>
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number; color?: string; icon?: string }> = ({ active, onClick, label, count, color = 'slate', icon }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 flex-shrink-0 ${active ? `bg-white/10 text-white` : 'text-slate-600 hover:text-slate-400'}`}>
    {icon && <i className={`fa-solid ${icon}`}></i>}
    {label}
    {count !== undefined && <span className={`px-1.5 py-0.5 rounded bg-black/40 text-[8px] ${active ? 'text-cyan-400' : 'text-slate-800'}`}>{count}</span>}
  </button>
);
