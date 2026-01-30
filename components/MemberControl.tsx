
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isUserOnline, updateMemberStatus, deleteMember, suspendMember, extendMember } from '../lib/api';

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

export const MemberControl: React.FC<MemberControlProps> = ({ onBack, lang }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { refreshData(); }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const { data: mems } = await supabase.from('members').select('*').order('created_at', { ascending: false });
      if (mems) setMembers(mems);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleAction = async (email: string, action: 'suspend' | 'extend' | 'approve' | 'delete') => {
    setIsProcessing(true);
    let success = false;
    if (action === 'suspend') success = await suspendMember(email);
    if (action === 'extend') success = await extendMember(email);
    if (action === 'approve') {
       const exp = new Date(); exp.setMonth(exp.getMonth() + 1);
       success = await updateMemberStatus(email, 'active', exp.toISOString());
    }
    if (action === 'delete') { if (confirm("Hapus permanen?")) success = await deleteMember(email); }
    
    if (success) refreshData();
    setIsProcessing(false);
  };

  const filteredMembers = members.filter(m => {
    const isTabMatch = activeTab === 'pending' ? m.status === 'pending' : m.status !== 'pending';
    const emailSearch = (m.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameSearch = (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isTabMatch && (emailSearch || nameSearch);
  });

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-black italic uppercase text-white">Member <span className="text-yellow-500">Control</span></h2>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
           <button onClick={() => setActiveTab('members')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${activeTab === 'members' ? 'bg-yellow-500 text-black' : 'text-slate-600'}`}>Active</button>
           <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${activeTab === 'pending' ? 'bg-yellow-500 text-black' : 'text-slate-600'}`}>Pending</button>
        </div>
      </div>

      <div className="relative">
        <i className="fa-solid fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 text-xs"></i>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search identity..." className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[11px] text-white focus:outline-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map(m => (
          <div key={m.id} className="glass-imagine p-6 rounded-[2rem] border border-white/5 space-y-5">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 min-w-0">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 font-black italic">{m.email ? m.email[0].toUpperCase() : '?'}</div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-black text-white truncate lowercase">{m.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(m.last_seen) ? 'bg-green-500 animate-pulse' : 'bg-slate-800'}`}></span>
                        <p className="text-[7px] font-black uppercase text-slate-600">{isUserOnline(m.last_seen) ? 'ONLINE' : 'OFFLINE'}</p>
                      </div>
                   </div>
                </div>
                <span className={`px-3 py-1 rounded-lg text-[7px] font-black uppercase ${m.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{m.status}</span>
             </div>

             <div className="grid grid-cols-2 gap-3 bg-black/40 p-4 rounded-xl border border-white/5">
                <div><p className="text-[7px] text-slate-600 font-black uppercase">Balance</p><p className="text-sm font-black text-cyan-400 italic">{(m.credits || 0).toLocaleString()} <span className="text-[8px] not-italic">CR</span></p></div>
                <div><p className="text-[7px] text-slate-600 font-black uppercase">Expiry</p><p className="text-[9px] font-bold text-slate-400">{m.valid_until ? new Date(m.valid_until).toLocaleDateString() : 'N/A'}</p></div>
             </div>

             <div className="flex gap-2">
                {m.status === 'pending' ? (
                  <button onClick={() => handleAction(m.email, 'approve')} className="flex-1 py-3 bg-green-600 text-white text-[9px] font-black uppercase rounded-xl">Approve</button>
                ) : (
                  <>
                    <button onClick={() => handleAction(m.email, 'extend')} className="flex-1 py-3 glass-imagine border border-white/10 text-[9px] font-black uppercase rounded-xl hover:bg-white/5 transition-all text-white">+30 Days</button>
                    <button onClick={() => handleAction(m.email, 'suspend')} className="flex-1 py-3 glass-imagine border border-white/10 text-[9px] font-black uppercase rounded-xl hover:bg-red-500/10 transition-all text-red-500">Suspend</button>
                  </>
                )}
                <button onClick={() => handleAction(m.email, 'delete')} className="w-12 h-12 glass-imagine border border-white/10 text-slate-700 hover:text-red-500 rounded-xl flex items-center justify-center"><i className="fa-solid fa-trash-can text-xs"></i></button>
             </div>
          </div>
        ))}
      </div>
      
      {isLoading && (
        <div className="py-20 flex flex-col items-center gap-4 opacity-10">
          <i className="fa-solid fa-spinner fa-spin text-4xl"></i>
          <p className="text-[10px] font-black uppercase tracking-widest">Accessing DB Node...</p>
        </div>
      )}
    </div>
  );
};
