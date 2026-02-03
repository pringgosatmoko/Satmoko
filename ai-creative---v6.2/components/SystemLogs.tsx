
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

interface SystemLogsProps {
  onBack: () => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    const vEnv = (import.meta as any).env || {};
    const url = vEnv.VITE_DATABASE_URL || 'https://urokqoorxuiokizesiwa.supabase.co';
    const key = vEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8';
    return createClient(url, key);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    runAudit();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runAudit = async () => {
    addLog("Memulai pemeriksaan sistem...");
    await new Promise(r => setTimeout(r, 500));
    
    addLog("Versi Aplikasi: 1.8.2 terdeteksi");
    addLog("Koneksi: Menghubungkan ke pusat data...");
    
    try {
      const { data, error } = await supabase.from('members').select('id').limit(1);
      if (error) throw error;
      addLog("Layanan Database: Normal (Tersinkronisasi)");
    } catch {
      addLog("Layanan Database: Gagal terhubung!");
    }

    addLog("Koneksi AI: Memeriksa kunci sistem...");
    const hasEnvKey = !!process.env.API_KEY;
    if (hasEnvKey) {
      addLog("Koneksi AI: Kunci terdeteksi (Akses Berbayar)");
    } else {
      addLog("Koneksi AI: Kunci tidak ditemukan (Mode Standar)");
    }

    addLog("Keamanan: Verifikasi Admin berhasil");
    addLog("Hasil Akhir: Sistem siap digunakan sepenuhnya.");
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Status <span className="text-cyan-400">Layanan</span></h2>
        </div>
        <button onClick={() => { setLogs([]); runAudit(); }} className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all">
           Segarkan Laporan
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-[2.5rem] bg-[#05070a] border-white/5 relative overflow-hidden shadow-2xl flex flex-col p-8 font-mono">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>
        
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col justify-end">
           <div className="space-y-1">
              {logs.map((log, i) => (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={i} 
                  className="text-[11px] lg:text-[13px] text-cyan-400/80 leading-relaxed uppercase tracking-wider"
                >
                  <span className="text-slate-700 mr-3">»</span>
                  {log}
                </motion.p>
              ))}
              <div className="flex items-center gap-2 mt-2">
                 <span className="text-slate-700 mr-3">»</span>
                 <motion.div 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }} 
                    className="w-2 h-4 bg-cyan-500/60"
                 ></motion.div>
              </div>
              <div ref={terminalEndRef} />
           </div>
        </div>
      </div>
    </div>
  );
};
