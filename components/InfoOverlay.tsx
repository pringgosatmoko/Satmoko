
import React from 'react';
import { motion } from 'framer-motion';

interface InfoOverlayProps {
  onClose: () => void;
  lang: 'id' | 'en';
}

export const InfoOverlay: React.FC<InfoOverlayProps> = ({ onClose, lang }) => {
  const content = {
    id: {
      title: "INFORMASI SISTEM",
      about: "TENTANG STUDIO",
      aboutDesc: "Satmoko Studio AI Creative Division adalah platform neural engine tercanggih yang mengintegrasikan kecerdasan buatan kelas dunia untuk produksi kreatif tanpa batas.",
      tech: "INFRASTRUKTUR TEKNOLOGI",
      contact: "HUBUNGI MASTER",
      close: "TUTUP PANEL"
    },
    en: {
      title: "SYSTEM INFORMATION",
      about: "ABOUT STUDIO",
      aboutDesc: "Satmoko Studio AI Creative Division is an advanced neural engine platform integrating world-class AI for limitless creative production.",
      tech: "TECH INFRASTRUCTURE",
      contact: "CONTACT MASTER",
      close: "CLOSE PANEL"
    }
  };

  const t = content[lang] || content.id;

  const contacts = [
    { name: 'WhatsApp', icon: 'fa-whatsapp', link: 'https://wa.me/6281234567890', color: 'bg-green-600' },
    { name: 'Telegram', icon: 'fa-paper-plane', link: 'https://t.me/pringgosatmoko', color: 'bg-sky-500' },
    { name: 'Email', icon: 'fa-envelope', link: 'mailto:pringgosatmoko@gmail.com', color: 'bg-red-600' }
  ];

  const techStack = [
    { name: 'Gemini 3 Pro', desc: 'Neural Logic Core' },
    { name: 'Veo 3.1', desc: 'Cinematic Video Engine' },
    { name: 'Midtrans', desc: 'Secure Encryption Gate' },
    { name: 'Neural Link', desc: 'Realtime Sync v2.5' }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="relative w-full max-w-lg bg-[#0d1117] border border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] rounded-full"></div>
        
        <header className="text-center mb-10">
          <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.6em] mb-4">{t.title}</h2>
          <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">SATMOKO <span className="text-slate-500">STUDIO</span></h3>
        </header>

        <div className="space-y-8">
          <section>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{t.about}</p>
            <p className="text-[11px] text-slate-300 leading-relaxed font-bold uppercase tracking-widest opacity-80">
              {t.aboutDesc}
            </p>
          </section>

          <section>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">{t.tech}</p>
            <div className="grid grid-cols-2 gap-3">
              {techStack.map(tech => (
                <div key={tech.name} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-black text-white uppercase">{tech.name}</p>
                  <p className="text-[7px] font-bold text-cyan-500 uppercase tracking-widest mt-1">{tech.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">{t.contact}</p>
            <div className="flex gap-3">
              {contacts.map(contact => (
                <a 
                  key={contact.name} 
                  href={contact.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                >
                  <i className={`fa-brands ${contact.icon} text-lg text-white`}></i>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{contact.name}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 py-5 bg-white text-black font-black uppercase rounded-2xl text-[10px] tracking-[0.4em] shadow-xl active:scale-95 transition-all"
        >
          {t.close}
        </button>
      </motion.div>
    </div>
  );
};
