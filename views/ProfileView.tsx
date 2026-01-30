
import React from 'react';
import { motion } from 'framer-motion';

interface ProfileViewProps {
  userEmail: string;
  userFullName?: string;
  credits: number;
  isPro: boolean;
  isAdmin: boolean;
  onLogout: () => void;
  onAction: (act: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ userEmail, userFullName, credits, isPro, isAdmin, onLogout, onAction }) => {
  const username = userFullName || userEmail.split('@')[0];
  
  // Fail-safe check: Jika nama adalah MASTER ADMIN atau status isAdmin true
  const isActuallyAdmin = isAdmin || userFullName === "MASTER ADMIN";

  const getPlanLabel = () => {
    if (isActuallyAdmin) return "MASTER ADMIN";
    if (credits >= 10000) return "PRO UNLIMITED";
    if (credits >= 3500) return "PRO 3 MONTHS";
    if (credits >= 1000) return "PRO 1 MONTH";
    return "FREE ACCESS";
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
      {/* Cover Section */}
      <div className="h-64 bg-gradient-to-br from-indigo-900 via-[#050505] to-[#000000] w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#050505] to-transparent"></div>
        
        {/* Floating Abstract Element */}
        <div className="absolute top-10 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Info Overlay */}
      <div className="px-8 -mt-24 relative z-10 flex flex-col items-center text-center">
        <div className="w-40 h-40 rounded-full border-8 border-[#050505] overflow-hidden bg-[#0d1117] shadow-2xl mb-6 ring-2 ring-white/5 p-1">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`} className="w-full h-full object-cover rounded-full" />
        </div>
        
        <div className="flex flex-col items-center gap-3 mb-2">
           <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{username}</h2>
           <div className="flex items-center gap-2">
             <span className="bg-white/5 border border-white/10 text-cyan-400 text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
               <i className="fa-solid fa-crown mr-2 text-[7px]"></i> {getPlanLabel()}
             </span>
             {isPro && <span className="bg-green-500/10 border border-green-500/20 text-green-500 text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">ACTIVE</span>}
           </div>
        </div>
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] mt-4">Hub Session Node: {isActuallyAdmin ? 'MASTER_ADMIN_CORE' : 'MEMBER_STUDIO_V7'}</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-12 w-full max-w-lg">
          {/* Admin Console - Moved UP for visibility */}
          {isActuallyAdmin && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-8 glass-imagine rounded-[3rem] border-2 border-yellow-500/30 bg-yellow-500/5 space-y-6 shadow-[0_0_50px_rgba(234,179,8,0.1)]"
            >
               <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mb-4 flex items-center justify-center gap-3">
                 <i className="fa-solid fa-terminal animate-pulse"></i> Master Admin Console
               </p>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <AdminQuickAction icon="fa-users-gear" label="Members" onClick={() => onAction('admin_members')} />
                  <AdminQuickAction icon="fa-receipt" label="Topups" onClick={() => onAction('admin_topups')} />
                  <AdminQuickAction icon="fa-database" label="Storage" onClick={() => onAction('admin_storage')} />
                  <AdminQuickAction icon="fa-code-branch" label="Logs" onClick={() => onAction('admin_logs')} />
                  <AdminQuickAction icon="fa-tags" label="Pricing" onClick={() => onAction('admin_pricing')} />
               </div>
            </motion.div>
          )}

          <div className="flex gap-4">
             <button onClick={() => onAction('security_settings')} className="flex-1 py-5 glass-imagine rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all shadow-xl">
               <i className="fa-solid fa-shield-halved mr-3 text-cyan-500"></i> Security
             </button>
             <button onClick={() => onAction('topup')} className="flex-1 py-5 glass-imagine rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all shadow-xl">
               <i className="fa-solid fa-rocket mr-3 text-purple-500"></i> Upgrade
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-10 mt-16 w-full max-w-md border-t border-white/5 pt-12">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black italic text-white leading-none tracking-tighter">{credits >= 999999 ? "∞" : credits.toLocaleString()}</span>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-3">Credits</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black italic text-white leading-none tracking-tighter">48</span>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-3">Creations</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black italic text-white leading-none tracking-tighter">1.2k</span>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-3">Views</span>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="px-8 mt-16 space-y-10">
        <div className="flex gap-10 border-b border-white/5 pb-6 overflow-x-auto no-scrollbar">
          <TabButton active label="Personal Art" />
          <TabButton label="Collections" />
          <TabButton label="Drafts" />
        </div>

        <div className="grid grid-cols-2 gap-5 pb-10">
           {[10,11,12,13].map(i => (
             <motion.div 
               key={i} 
               whileHover={{ scale: 1.02 }}
               className="aspect-square rounded-[2rem] overflow-hidden glass-imagine border border-white/5 relative group shadow-2xl"
             >
                <img src={`https://picsum.photos/400/400?random=${i + 100}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
             </motion.div>
           ))}
        </div>
        
        <button onClick={onLogout} className="w-full py-6 rounded-[2rem] border-2 border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-[0.5em] hover:bg-red-500/10 active:scale-95 transition-all mb-12">
          TERMINE HUB SESSION
        </button>
      </div>
    </div>
  );
};

const AdminQuickAction = ({ icon, label, onClick }: { icon: string, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-yellow-500 group-hover:text-black transition-all shadow-lg">
       <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">{label}</span>
  </button>
);

const TabButton = ({ active, label }: { active?: boolean, label: string }) => (
  <button className={`flex items-center gap-2 pb-1 transition-all flex-shrink-0 relative ${active ? 'text-white' : 'text-slate-700'}`}>
    <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    {active && <motion.div layoutId="tab-underline" className="absolute -bottom-[25px] left-0 right-0 h-[3px] bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
  </button>
);
