
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestTopup, supabase, createMidtransToken, processMidtransTopup } from '../lib/api';

interface TopupCenterProps {
  onBack: () => void;
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
  lang: 'id' | 'en';
}

export const TopupCenter: React.FC<TopupCenterProps> = ({ onBack, userEmail, credits, refreshCredits, lang }) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'history'>('buy');
  const [paymentMethod, setPaymentMethod] = useState<'auto' | 'manual'>('auto');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const packages = [
    { credits: 500, price: 50000, label: 'Starter Pack', duration: '30 Days', id: 'STARTER', popular: false },
    { credits: 1200, price: 100000, label: 'Pro Creator', duration: '30 Days', id: 'PRO1', popular: true },
    { credits: 4000, price: 250000, label: 'Studio Master', duration: '90 Days', id: 'PRO3', popular: false },
    { credits: 10000, price: 500000, label: 'Enterprise Node', duration: '180 Days', id: 'ENT', popular: false }
  ];

  useEffect(() => {
    if (activeTab === 'history') fetchMyHistory();
  }, [activeTab]);

  const fetchMyHistory = async () => {
    const { data } = await supabase.from('topup_requests').select('*').eq('email', userEmail.toLowerCase()).order('created_at', { ascending: false });
    if (data) setMyRequests(data);
  };

  const handleMidtransPayment = async () => {
    if (selectedPackage === null) return;
    const pkg = packages[selectedPackage];

    setIsProcessing(true);
    try {
      const res = await createMidtransToken(userEmail, pkg.credits, pkg.price);
      if (res && res.token && (window as any).snap) {
        (window as any).snap.pay(res.token, {
          onSuccess: async (result: any) => {
            setIsProcessing(true);
            await processMidtransTopup(userEmail, pkg.credits, res.orderId);
            refreshCredits();
            setTransactionId(res.orderId);
            setShowSuccess(true);
            setIsProcessing(false);
          },
          onPending: (result: any) => {
            alert(lang === 'id' ? "Pembayaran sedang diproses, Master." : "Payment is pending, Master.");
            onBack();
          },
          onError: (result: any) => {
            alert(lang === 'id' ? "Sistem pembayaran error." : "Payment system error.");
            setIsProcessing(false);
          },
          onClose: () => setIsProcessing(false)
        });
      } else {
        throw new Error("Gagal menginisialisasi gerbang pembayaran.");
      }
    } catch (e: any) { 
      alert(e.message || "Error menginisialisasi pembayaran otomatis.");
      setIsProcessing(false); 
    }
  };

  const handleSubmitManual = async () => {
    if (selectedPackage === null || !receipt) return;
    setIsProcessing(true);
    const pkg = packages[selectedPackage];
    try {
      const res = await requestTopup(userEmail, pkg.credits, pkg.price, receipt);
      if (res.success) {
        setTransactionId(res.tid);
        setShowSuccess(true);
      }
    } catch (e) { alert("Permintaan manual gagal dikirim."); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90 shadow-xl">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Fuel <span className="text-cyan-400">Node</span></h2>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">Satmoko Studio Credit Injection</p>
          </div>
        </div>
        
        <div className="flex bg-[#0d1117] p-1.5 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('buy')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'buy' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-500'}`}>TOP UP</button>
          <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-500'}`}>HISTORY</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-2">
        <AnimatePresence mode="wait">
          {activeTab === 'buy' ? (
            !showSuccess ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {packages.map((pkg, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedPackage(idx)} 
                        className={`relative p-8 rounded-[3rem] border-2 text-left transition-all overflow-hidden group ${selectedPackage === idx ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-[#0d1117] opacity-60 hover:opacity-100'}`}
                      >
                        {pkg.popular && (
                          <div className="absolute top-4 right-[-30px] bg-cyan-500 text-black text-[7px] font-black py-1 px-10 rotate-45 uppercase shadow-xl">POPULAR</div>
                        )}
                        <div className="flex flex-col gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedPackage === idx ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-600'}`}>
                            <i className="fa-solid fa-bolt-lightning text-xl"></i>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{pkg.label}</p>
                            <p className="text-3xl font-black text-white italic leading-none">{pkg.credits.toLocaleString()} <span className="text-[12px] not-italic opacity-40">CR</span></p>
                          </div>
                          <p className="text-[11px] font-black text-cyan-400 uppercase tracking-tighter">Rp {pkg.price.toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedPackage !== null && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] px-2">Metode Autentikasi Pembayaran</p>
                       <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setPaymentMethod('auto')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'auto' ? 'border-cyan-500 bg-cyan-500/5 text-white' : 'border-white/5 text-slate-600 opacity-40'}`}>
                             <i className="fa-solid fa-shield-check text-xl"></i>
                             <span className="text-[9px] font-black uppercase tracking-widest text-center">INSTANT CHECKOUT (SNAP)</span>
                          </button>
                          <button onClick={() => setPaymentMethod('manual')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'manual' ? 'border-white bg-white/5 text-white' : 'border-white/5 text-slate-600 opacity-40'}`}>
                             <i className="fa-solid fa-receipt text-xl"></i>
                             <span className="text-[9px] font-black uppercase tracking-widest text-center">MANUAL TRANSFER VALIDATION</span>
                          </button>
                       </div>

                       {paymentMethod === 'manual' && (
                         <div className="glass-imagine p-8 rounded-[3rem] border border-white/5 space-y-6">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                               <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">Kirim Bukti Transfer ke Admin untuk aktivasi manual. Proses 5-10 menit.</p>
                            </div>
                            <label className="relative aspect-video rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-black/40 overflow-hidden cursor-pointer hover:bg-white/5 transition-all">
                               {receipt ? <img src={receipt} className="w-full h-full object-contain" /> : (
                                 <>
                                    <i className="fa-solid fa-cloud-arrow-up text-slate-800 text-4xl mb-3"></i>
                                    <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Pilih Gambar Resi</span>
                                    <input type="file" onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) { const r = new FileReader(); r.onload = (ev) => setReceipt(ev.target?.result as string); r.readAsDataURL(f); }
                                    }} className="hidden" accept="image/*" />
                                 </>
                               )}
                            </label>
                         </div>
                       )}
                    </motion.div>
                  )}
                </div>

                <div className="lg:col-span-5">
                  <div className="glass-imagine p-10 rounded-[4rem] border border-white/5 shadow-2xl sticky top-6 space-y-10">
                     <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20"><i className="fa-solid fa-cart-shopping"></i></div>
                        <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Checkout Node</h4>
                     </div>
                     
                     {selectedPackage !== null ? (
                       <div className="space-y-5">
                          <div className="flex justify-between text-[11px] font-black"><span className="text-slate-600 uppercase">IDENTITAS:</span><span className="text-white">{userEmail}</span></div>
                          <div className="flex justify-between text-[11px] font-black"><span className="text-slate-600 uppercase">FUEL:</span><span className="text-cyan-400">+{packages[selectedPackage].credits} CR</span></div>
                          <div className="pt-8 border-t border-white/5 flex justify-between items-end"><span className="text-[10px] font-black text-white uppercase tracking-widest">TOTAL BIAYA</span><span className="text-4xl font-black italic text-cyan-400">Rp {packages[selectedPackage].price.toLocaleString()}</span></div>
                       </div>
                     ) : (
                       <div className="py-12 flex flex-col items-center gap-4 opacity-20">
                          <i className="fa-solid fa-box-open text-4xl"></i>
                          <p className="text-[10px] font-bold uppercase tracking-widest">Pilih Paket Terlebih Dahulu</p>
                       </div>
                     )}

                     <button 
                        onClick={paymentMethod === 'auto' ? handleMidtransPayment : handleSubmitManual} 
                        disabled={selectedPackage === null || isProcessing || (paymentMethod === 'manual' && !receipt)} 
                        className="w-full py-6 rounded-[2rem] bg-cyan-500 text-black font-black uppercase text-xs tracking-[0.3em] transition-all active:scale-95 disabled:opacity-20 shadow-[0_20px_40px_rgba(34,211,238,0.2)] hover:bg-white"
                      >
                        {isProcessing ? "PROCESSING..." : "PAY SECURELY NOW"}
                     </button>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto py-20 text-center space-y-10 glass-imagine p-12 rounded-[4rem] border border-cyan-500/30 bg-cyan-500/5">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-cyan-500 text-black flex items-center justify-center mx-auto text-4xl shadow-[0_0_60px_rgba(34,211,238,0.4)] border-4 border-black"><i className="fa-solid fa-check"></i></div>
                 <div>
                    <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">SUCCESS!</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-4 leading-relaxed">Kredit telah berhasil disuntikkan ke Node Master.</p>
                    <p className="text-[8px] font-black text-cyan-600 uppercase tracking-widest mt-6 bg-cyan-950/40 py-2 rounded-lg">ID REF: {transactionId}</p>
                 </div>
                 <button onClick={() => { setShowSuccess(false); onBack(); }} className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:bg-cyan-500 transition-all">CLOSE HUB</button>
              </motion.div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {myRequests.map((req) => (
                 <div key={req.id} className="glass-imagine p-8 rounded-[3rem] border border-white/5 flex flex-col gap-6 relative group overflow-hidden">
                    <div className="flex justify-between items-start">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${req.status === 'approved' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-700'}`}>
                          <i className={`fa-solid ${req.status === 'approved' ? 'fa-check-double' : 'fa-hourglass-start'}`}></i>
                       </div>
                       <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'approved' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-yellow-500/10 text-yellow-500'}`}>{req.status}</span>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">TRANSACTION ID</p>
                       <p className="text-xs font-black text-white italic tracking-tighter uppercase">{req.tid}</p>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/5 pt-6">
                       <div>
                          <p className="text-[9px] font-black text-slate-700 uppercase mb-1">Fuel Injected</p>
                          <p className="text-xl font-black text-white italic">{req.amount.toLocaleString()} CR</p>
                       </div>
                       <p className="text-[8px] font-bold text-slate-800 uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))}
               {myRequests.length === 0 && (
                 <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-10 gap-6">
                    <i className="fa-solid fa-history text-8xl"></i>
                    <p className="text-sm font-black uppercase tracking-[1em]">No Records Found</p>
                 </div>
               )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
