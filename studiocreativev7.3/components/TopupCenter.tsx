
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { topupCredits, sendTelegramNotification } from '../lib/api';

interface TopupCenterProps {
  onBack: () => void;
  userEmail: string;
  credits: number;
  refreshCredits: () => void;
  lang: 'id' | 'en';
}

export const TopupCenter: React.FC<TopupCenterProps> = ({ onBack, userEmail, credits, refreshCredits, lang }) => {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  const packages = [
    { credits: 1000, price: 100000, label: 'Standard Access' },
    { credits: 3500, price: 250000, label: 'Professional Tier' },
    { credits: 8000, price: 500000, label: 'Creative Studio' },
    { credits: 15000, price: 900000, label: 'Unlimited Master' }
  ];

  const t = {
    id: {
      title: "Isi Saldo Kredit",
      subtitle: "Pilih Paket Kredit Untuk Produksi AI",
      select: "Pilih Paket Master",
      summary: "Ringkasan Pesanan",
      checkout: "BAYAR SEKARANG",
      processing: "MENGHUBUNGKAN GATEWAY...",
      successTitle: "PEMBAYARAN BERHASIL!",
      successDesc: "Kredit telah ditambahkan secara otomatis ke akun Master.",
      back: "KEMBALI KE MENU",
      info: "Sistem pembayaran otomatis menggunakan Neural Gateway V3. Saldo akan masuk secara instan setelah konfirmasi pembayaran."
    },
    en: {
      title: "Topup Credits",
      subtitle: "Select Credit Packages For AI Production",
      select: "Select Master Package",
      summary: "Order Summary",
      checkout: "PROCEED TO PAYMENT",
      processing: "CONNECTING GATEWAY...",
      successTitle: "PAYMENT SUCCESSFUL!",
      successDesc: "Credits have been automatically added to your Master account.",
      back: "BACK TO MENU",
      info: "Automatic payment system using Neural Gateway V3. Credits will be added instantly after payment confirmation."
    }
  }[lang];

  const handlePayment = async () => {
    if (selectedPackage === null) return;
    
    setIsProcessing(true);
    const pkg = packages[selectedPackage];
    const tid = `SAT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setTransactionId(tid);

    // Simulate Payment Gateway Delay
    await new Promise(r => setTimeout(r, 2500));

    try {
      const success = await topupCredits(userEmail, pkg.credits);
      if (success) {
        setShowSuccess(true);
        sendTelegramNotification(`💰 *TOPUP SUCCESS*\nUser: ${userEmail}\nAmount: ${pkg.credits} CR\nPrice: Rp ${pkg.price.toLocaleString()}\nID: ${tid}`);
        refreshCredits();
      } else {
        alert("Gagal memproses transaksi. Hubungi Admin.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{t.title}</h2>
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1">{t.subtitle}</p>
          </div>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest leading-none mb-1">Saldo Saat Ini</p>
           <p className="text-xl font-black italic text-cyan-400 leading-none">{credits.toLocaleString()} CR</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedPackage(idx)}
                    className={`glass-panel p-6 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group ${selectedPackage === idx ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/5 bg-slate-900/40 hover:border-white/20'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedPackage === idx ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-500'} transition-colors`}>
                        <i className="fa-solid fa-coins text-xl"></i>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{pkg.label}</p>
                        <p className="text-xl font-black italic text-white leading-none mt-1">{pkg.credits.toLocaleString()} <span className="text-[10px] text-cyan-500">CR</span></p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[10px] font-black text-slate-400">Rp {pkg.price.toLocaleString()}</span>
                      {selectedPackage === idx && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 bg-cyan-500 text-black rounded-full flex items-center justify-center text-[10px]">
                          <i className="fa-solid fa-check"></i>
                        </motion.span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="glass-panel p-8 rounded-[3rem] bg-[#0d1117] border border-white/5 shadow-2xl space-y-8 sticky top-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none">{t.summary}</p>
                  <div className="h-px bg-white/5 w-full"></div>
                </div>

                {selectedPackage !== null ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Paket</span>
                      <span className="text-[11px] font-black text-white uppercase">{packages[selectedPackage].label}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Kredit</span>
                      <span className="text-[11px] font-black text-cyan-400 uppercase">+{packages[selectedPackage].credits.toLocaleString()} CR</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-[11px] font-black text-white uppercase">TOTAL</span>
                      <span className="text-xl font-black italic text-white">Rp {packages[selectedPackage].price.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-20 gap-4">
                    <i className="fa-solid fa-cart-shopping text-4xl"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">{t.select}</p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] text-slate-500 font-bold leading-relaxed italic">
                   {t.info}
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={selectedPackage === null || isProcessing}
                  className="w-full py-5 rounded-[2rem] bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-cyan-500 transition-all shadow-2xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {t.processing}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-credit-card"></i>
                      {t.checkout}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto py-12">
            <div className="glass-panel p-10 rounded-[4rem] bg-[#0d1117] border border-cyan-500/30 shadow-[0_0_100px_rgba(34,211,238,0.1)] text-center space-y-8">
              <div className="w-24 h-24 rounded-full bg-cyan-500 text-black flex items-center justify-center mx-auto text-4xl shadow-[0_0_40px_#22d3ee] mb-4">
                <i className="fa-solid fa-check-double"></i>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">{t.successTitle}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed px-4">{t.successDesc}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">Transaction ID</p>
                <code className="text-[11px] font-black text-cyan-500 uppercase">{transactionId}</code>
              </div>
              <button onClick={onBack} className="w-full py-5 rounded-3xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">
                {t.back}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
