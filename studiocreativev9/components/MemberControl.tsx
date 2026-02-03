
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isUserOnline, approveTopup, manualUpdateCredits } from '../lib/api';

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

interface TopupRequest {
  id: number;
  tid: string;
  email: string;
  amount: number;
  price: number;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface MemberControlProps {
  onBack: () => void;
  lang: 'id' | 'en';
}

export const MemberControl: React.FC<MemberControlProps> = ({ onBack, lang }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'topup'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newCreditValue, setNewCreditValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    refreshData();
    const timer = setInterval(refreshData, 10000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = async () => {
    await Promise.all([fetchMembers(), fetchRequests()]);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*');
    if (data) setMembers([...data].sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime()));
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from('topup_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  const handleApprove = async (req: TopupRequest) => {
    if (!confirm(`Setujui Topup ${req.amount} CR untuk ${req.email}?`)) return;
    setIsProcessing(true);
    const success = await approveTopup(req.id, req.email, req.amount);
    if (success) {
      alert("Topup Berhasil Disetujui! Saldo member telah bertambah.");
      refreshData();
    } else {
      alert("Gagal memproses. Pastikan tabel 'members' Master sudah ada.");
    }
    setIsProcessing(false);
  };

  const handleReject = async (requestId: number) => {
    if (!confirm("Tolak permintaan topup ini?")) return;
    await supabase.from('topup_requests').update({ status: 'rejected' }).eq('id', requestId);
    refreshData();
  };

  const handleManualCredit = async () => {
    if (!editingMember) return;
    setIsProcessing(true);
    const success = await manualUpdateCredits(editingMember.email, newCreditValue);
    if (success) {
      alert("Saldo Berhasil Diupdate!");
      setEditingMember(null);
      refreshData();
    } else {
      alert("Gagal update saldo.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-chevron-left"></i></button>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Member <span className="text-red-500">Control</span></h2>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1">Advanced Studio Governance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refreshData} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-cyan-500 flex items-center justify-center transition-all"><i className="fa-solid fa-rotate"></i></button>
          <div className="flex bg-black/60 p-1 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('members')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'members' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>DATA_MEMBER</button>
            <button onClick={() => setActiveTab('topup')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all relative ${activeTab === 'topup' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500'}`}>
              PENDING_TOPUP
              {requests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">{requests.length}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="wait">
          {activeTab === 'members' ? (
            <motion.div key="mem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari email member..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-[11px] text-white outline-none focus:border-cyan-500/30" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {members.filter(m => m.email.includes(searchTerm.toLowerCase())).map(m => (
                   <div key={m.id} className="glass-panel p-6 rounded-[2rem] bg-[#0d1117] border border-white/5 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border ${isUserOnline(m.last_seen) ? 'border-green-500 text-green-500' : 'border-white/5 text-slate-700'}`}>{m.email.charAt(0).toUpperCase()}</div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-white truncate uppercase tracking-tighter">{m.full_name || 'MEMBER'}</p>
                            <p className="text-[8px] text-slate-600 truncate">{m.email}</p>
                         </div>
                      </div>
                      <div className="flex justify-between items-center px-2 bg-black/40 py-3 rounded-xl border border-white/5">
                         <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Kredit Aktif</p>
                         <p className="text-lg font-black text-cyan-400 italic">{(m.credits || 0).toLocaleString()} CR</p>
                      </div>
                      <button onClick={() => { setEditingMember(m); setNewCreditValue(m.credits || 0); }} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all">EDIT SALDO MANUAL</button>
                   </div>
                 ))}
                 {members.length === 0 && <div className="col-span-full py-20 text-center opacity-10 flex flex-col items-center gap-6"><i className="fa-solid fa-users-slash text-7xl"></i><p className="text-xs font-black uppercase tracking-[0.5em]">BELUM ADA MEMBER</p></div>}
              </div>
            </motion.div>
          ) : (
            <motion.div key="topup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {requests.map(req => (
                 <div key={req.id} className="glass-panel p-8 rounded-[3rem] bg-[#0d1117] border border-white/5 space-y-6">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-[7px] font-black text-slate-700 uppercase tracking-[0.4em] mb-1">ID_TRANSAKSI</p>
                          <h4 className="text-xs font-black text-cyan-500 tracking-widest">{req.tid}</h4>
                       </div>
                       <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[8px] font-black rounded-lg uppercase tracking-widest">WAITING</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center">
                       <div>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">PENGIRIM</p>
                          <p className="text-[10px] font-bold text-white">{req.email}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">JUMLAH</p>
                          <p className="text-xl font-black italic text-cyan-400">{req.amount.toLocaleString()} CR</p>
                       </div>
                    </div>
                    <div className="aspect-video rounded-[2rem] border border-white/10 bg-black overflow-hidden relative group">
                       {req.receipt_url && req.receipt_url !== "GAMBAR_TERLALU_BESAR" ? (
                         <img src={req.receipt_url} className="w-full h-full object-cover" />
                       ) : <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 gap-2"><i className="fa-solid fa-image text-3xl"></i><p className="text-[8px] font-black">GAMBAR TERLALU BESAR / TIDAK ADA</p></div>}
                       {req.receipt_url && <button onClick={() => window.open(req.receipt_url, '_blank')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-[10px] font-black uppercase">Lihat Full Bukti</button>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => handleApprove(req)} disabled={isProcessing} className="py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-white hover:text-green-600 transition-all">APPROVE</button>
                       <button onClick={() => handleReject(req.id)} disabled={isProcessing} className="py-4 bg-white/5 border border-white/10 text-red-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">REJECT</button>
                    </div>
                 </div>
               ))}
               {requests.length === 0 && <div className="col-span-full h-64 flex flex-col items-center justify-center opacity-10"><i className="fa-solid fa-list-check text-6xl mb-4"></i><p className="text-xs font-black uppercase tracking-[0.5em]">TIDAK ADA PERMINTAAN TOPUP</p></div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Edit Saldo Manual */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-panel p-8 rounded-[3rem] bg-[#0d1117] border border-white/10 max-w-sm w-full space-y-6">
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Update Saldo Manual</p>
                   <h3 className="text-sm font-black text-white mt-1 uppercase truncate">{editingMember.email}</h3>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">Nilai Saldo Baru</label>
                   <input type="number" value={newCreditValue} onChange={e => setNewCreditValue(parseInt(e.target.value) || 0)} className="w-full bg-black/60 border border-white/5 rounded-2xl py-4 px-6 text-xl font-black italic text-cyan-400 text-center focus:outline-none focus:border-cyan-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <button onClick={() => setEditingMember(null)} className="py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl text-[10px] font-black uppercase">BATAL</button>
                   <button onClick={handleManualCredit} disabled={isProcessing} className="py-4 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-white hover:text-cyan-600 transition-all">SIMPAN</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
