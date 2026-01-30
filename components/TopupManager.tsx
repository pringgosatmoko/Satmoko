
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingTopups, approveTopup } from '../lib/api';

interface TopupManagerProps {
  onBack: () => void;
  lang: 'id' | 'en';
}

export const TopupManager: React.FC<TopupManagerProps> = ({ onBack, lang }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await getPendingTopups();
    setRequests(data);
    setIsLoading(false);
  };

  const handleApprove = async (id: number) => {
    if (!confirm("VALIDASI PEMBAYARAN: Apakah dana sudah masuk ke rekening Master?")) return;
    setIsProcessing(true);
    const success = await approveTopup(id);
    if (success) {
      setRequests(prev => prev.filter(r => r.id !== id));
      alert("PEMBAYARAN DIVALIDASI. KREDIT USER TELAH DITAMBAHKAN.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-8 pb-32 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><i className="fa-solid fa-chevron-left"></i></button>
          <h2 className="text-2xl font-black italic uppercase text-white">Topup <span className="text-cyan-400">Requests</span></h2>
        </div>
        <button onClick={loadRequests} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 active:scale-90"><i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requests.map(req => (
          <div key={req.id} className="glass-imagine p-8 rounded-[3rem] border border-white/5 space-y-6">
             <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{req.tid}</p>
                   <p className="text-xs font-bold text-white lowercase">{req.email}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-500 text-black text-[8px] font-black uppercase rounded-lg">WAITING VALIDATION</span>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Package</p>
                   <p className="text-sm font-black text-cyan-400 italic">{req.amount.toLocaleString()} CR</p>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Paid Amount</p>
                   <p className="text-sm font-black text-white italic">Rp {req.price.toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-3">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">Bukti Transfer (Receipt)</p>
                <div 
                  onClick={() => setSelectedImage(req.receipt_url)}
                  className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 cursor-zoom-in"
                >
                   {req.receipt_url ? <img src={req.receipt_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-800"><i className="fa-solid fa-image text-3xl"></i></div>}
                </div>
             </div>

             <button 
                onClick={() => handleApprove(req.id)} 
                disabled={isProcessing}
                className="w-full py-5 bg-cyan-500 text-black font-black uppercase rounded-2xl text-[10px] tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-20"
             >
               {isProcessing ? "PROCESSING VALIDATION..." : "VALIDATE & ADD CREDITS"}
             </button>
          </div>
        ))}
        {requests.length === 0 && !isLoading && (
          <div className="md:col-span-2 py-20 flex flex-col items-center justify-center opacity-10 gap-4">
             <i className="fa-solid fa-receipt text-6xl"></i>
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Pending Requests</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 lg:p-20">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
             <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} src={selectedImage} className="relative max-w-full max-h-full rounded-3xl border border-white/10 shadow-2xl z-10" />
             <button onClick={() => setSelectedImage(null)} className="absolute top-10 right-10 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center z-20 active:scale-90 shadow-xl"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
