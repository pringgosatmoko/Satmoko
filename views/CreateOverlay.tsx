
import React from 'react';
import { motion } from 'framer-motion';

interface CreateOverlayProps {
  onClose: () => void;
  onSelect: (mode: string) => void;
}

export const CreateOverlay: React.FC<CreateOverlayProps> = ({ onClose, onSelect }) => {
  const mainActions = [
    { id: 'txt2img', label: 'Create AI Image', desc: 'Create stunning AI Images from text', icon: 'fa-image', color: 'bg-indigo-600' },
    { id: 'img2vid', label: 'Create AI Video', desc: 'Create cinematic video with Veo Engine', icon: 'fa-video', color: 'bg-emerald-600' },
    { id: 'edit', label: 'Edit Image', desc: 'Retouch and edit with AI tools', icon: 'fa-wand-magic-sparkles', color: 'bg-pink-600' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative bg-[#121212] rounded-t-[3.5rem] px-8 pt-12 pb-20 border-t border-white/5 shadow-2xl"
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/10 rounded-full"></div>
        
        <header className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-widest">Create Art</h2>
          <button onClick={onClose} className="w-10 h-10 glass-imagine rounded-full flex items-center justify-center text-slate-500 active:scale-90">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="grid grid-cols-4 gap-5 mb-12">
           <SmallAction onClick={() => onSelect('reframe')} icon="fa-vector-square" label="Outpaint" />
           <SmallAction onClick={() => onSelect('faceswap')} icon="fa-masks-theater" label="Face Swap" />
           <SmallAction onClick={() => onSelect('edit')} icon="fa-wand-magic-sparkles" label="Retouch" />
           <SmallAction onClick={() => onSelect('txt2img')} icon="fa-palette" label="Image Gen" />
        </div>

        <div className="space-y-4">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] px-1 mb-4">Production Core</p>
           {mainActions.map(action => (
             <button 
               key={action.id}
               onClick={() => onSelect(action.id)}
               className="w-full glass-imagine p-6 rounded-imagine-lg flex items-center gap-6 group active:scale-[0.98] transition-all border border-white/5 hover:border-purple-500/20"
             >
                <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl group-hover:scale-110 transition-transform`}>
                  <i className={`fa-solid ${action.icon}`}></i>
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">{action.label}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">{action.desc}</p>
                </div>
                <div className="ml-auto opacity-20 group-hover:opacity-100 transition-opacity">
                   <i className="fa-solid fa-chevron-right text-xs"></i>
                </div>
             </button>
           ))}
        </div>
      </motion.div>
    </div>
  );
};

const SmallAction = ({ icon, label, onClick }: { icon: string, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-3 active:scale-90 transition-all">
    <div className="w-14 h-14 rounded-[1.5rem] border border-white/5 flex items-center justify-center text-slate-400 bg-white/5">
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <span className="text-[8px] font-black text-slate-600 uppercase text-center tracking-tighter">{label}</span>
  </button>
);
