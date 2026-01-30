
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auditApiKeys } from '../lib/api';

interface SystemLogsProps {
  onBack: () => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
    addLog("MENYIAPKAN AUDIT ENGINE v5.4.1...");
    await new Promise(r => setTimeout(r, 600));
    
    const status = auditApiKeys();
    addLog(`MASTER_CORE: KONEKSI TERJALIN`);
    addLog(`------------------------------------`);
    addLog(`VERIFIKASI INFRASTRUKTUR NEURAL:`);
    addLog(`- Database Node: ${status.db ? 'ONLINE (ENCRYPTED)' : 'OFFLINE'}`);
    addLog(`- Gemini Slot 1: ${status.slot1 ? 'READY' : 'MISSING'}`);
    addLog(`- Gemini Slot 2: ${status.slot2 ? 'READY' : 'MISSING'}`);
    addLog(`- Gemini Slot 3: ${status.slot3 ? 'READY' : 'MISSING'}`);
    addLog(`- Telegram Bot: ${status.telegram ? 'CONNECTED' : 'NOT LINKED'}`);
    addLog(`- Active Key Slot: ${status.activeSlot}`);
    addLog(`------------------------------------`);
    addLog(`STATUS: SEMUA SISTEM NOMINAL`);
    addLog(`LOG: Master Console siap menerima perintah.`);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Console <span className="text-cyan-400">Master</span></h2>
        </div>
        <button onClick={() => { setLogs([]); runAudit(); }} className="w-10 h-10 bg-white/5 border border-white/10 text-slate-500 rounded-xl flex items-center justify-center hover:text-white active:scale-90 shadow-lg">
             <i className="fa-solid fa-sync"></i>
        </button>
      </div>

      <div className="flex-1 glass-panel rounded-[2.5rem] bg-[#05070a] border-white/5 relative overflow-hidden shadow-2xl flex flex-col p-8 font-mono border-l-4 border-l-cyan-500/30">
         <div className="flex-1 overflow-y-auto no-scrollbar pr-4 flex flex-col">
            <div className="space-y-2 py-4">
               {logs.map((log, i) => {
                 const logStr = log || '';
                 const isPositive = logStr.includes("READY") || logStr.includes("ONLINE") || logStr.includes("CONNECTED");
                 return (
                   <p key={i} className={`text-[10px] lg:text-[12px] leading-relaxed tracking-wider ${isPositive ? "text-cyan-400 font-bold" : "text-slate-500"}`}>
                     <span className="text-slate-800 mr-2">»</span>
                     {logStr}
                   </p>
                 );
               })}
               <div className="flex items-center gap-2 mt-4">
                  <span className="text-slate-800 mr-2">»</span>
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-4 bg-cyan-500/60" />
               </div>
               <div ref={terminalEndRef} />
            </div>
         </div>
      </div>
      <p className="text-center text-[8px] font-bold text-slate-800 uppercase tracking-[0.6em]">NEURAL ENGINE v5.4.1 • SATMOKO STUDIO INFRASTRUCTURE</p>
    </div>
  );
};
