
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

interface Message {
  id: string | number;
  sender_email: string;
  receiver_email: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Member {
  email: string;
  full_name?: string;
  status: string;
}

interface DirectChatProps {
  userEmail: string;
  isAdmin: boolean;
  adminEmail: string;
  initialTarget?: string | null;
  onBack: () => void;
}

export const DirectChat: React.FC<DirectChatProps> = ({ userEmail, isAdmin, adminEmail, initialTarget, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [contacts, setContacts] = useState<(Member & { lastMsg?: string, time?: string, unread?: number, isOfficial?: boolean })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(initialTarget || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const msgSound = useMemo(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'), []);

  const supabase = useMemo(() => {
    const vEnv = (import.meta as any).env || {};
    const pEnv = (typeof process !== 'undefined' ? process.env : {}) || {};
    const url = vEnv.VITE_DATABASE_URL || pEnv.VITE_DATABASE_URL || 'https://urokqoorxuiokizesiwa.supabase.co';
    const key = vEnv.VITE_SUPABASE_ANON_KEY || pEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8';
    return createClient(url, key);
  }, []);

  useEffect(() => {
    fetchContactsAndHistory();
    if (selectedUser) {
      fetchMessages(selectedUser);
      markAsRead(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-chat-v6')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
        const newMessage = payload.new as Message;
        const isToMe = newMessage.receiver_email.toLowerCase() === userEmail.toLowerCase();
        const isFromSelected = newMessage.sender_email.toLowerCase() === selectedUser?.toLowerCase();
        const isMeSending = newMessage.sender_email.toLowerCase() === userEmail.toLowerCase() && newMessage.receiver_email.toLowerCase() === selectedUser?.toLowerCase();

        if (isFromSelected && isToMe) {
          setMessages(prev => [...prev, newMessage]);
          markAsRead(selectedUser!);
          msgSound.play().catch(() => {});
        } else if (isMeSending) {
          setMessages(prev => [...prev, newMessage]);
        } else if (isToMe) {
          msgSound.play().catch(() => {});
          fetchContactsAndHistory();
        }
        fetchContactsAndHistory();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, payload => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, payload => {
        const deletedId = payload.old.id;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
        fetchContactsAndHistory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, userEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const markAsRead = async (target: string) => {
    if (!target) return;
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('receiver_email', userEmail.toLowerCase())
      .eq('sender_email', target.toLowerCase())
      .eq('is_read', false);
  };

  const sendTelegramForward = async (msg: string, to: string) => {
    try {
      const { data: configs } = await supabase.from('system_configs').select('*');
      const token = configs?.find(c => c.key === 'telegram_bot_token')?.value;
      const chatId = configs?.find(c => c.key === 'telegram_chat_id')?.value;
      
      if (token && chatId && token.length > 10) {
        const text = `<b>✉️ NEW DIRECT MESSAGE</b>\n\n<b>From:</b> <code>${userEmail}</code>\n<b>To:</b> <code>${to}</code>\n<b>Content:</b>\n<i>"${msg}"</i>`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
      }
    } catch (e) { console.warn("Telegram silent fail"); }
  };

  const fetchContactsAndHistory = async () => {
    try {
      const { data: membersRaw } = await supabase.from('members').select('email, full_name, status');
      const { data: lastMessages } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_email.eq.${userEmail.toLowerCase()},receiver_email.eq.${userEmail.toLowerCase()}`)
        .order('created_at', { ascending: false });

      let membersList = membersRaw || [];
      
      const hasAdmin = membersList.some(m => m.email.toLowerCase() === adminEmail.toLowerCase());
      if (!hasAdmin) {
        membersList.push({
          email: adminEmail,
          full_name: 'Admin Satmoko',
          status: 'active'
        });
      }

      const processedContacts = membersList
        .filter(m => m.email.toLowerCase() !== userEmail.toLowerCase())
        .map(member => {
          const history = lastMessages?.filter(m => 
            m.sender_email.toLowerCase() === member.email.toLowerCase() || 
            m.receiver_email.toLowerCase() === member.email.toLowerCase()
          );
          const lastMsg = history?.[0];
          const unreadCount = history?.filter(m => m.receiver_email.toLowerCase() === userEmail.toLowerCase() && !m.is_read).length || 0;
          const isOfficial = member.email.toLowerCase() === adminEmail.toLowerCase();

          return {
            ...member,
            lastMsg: lastMsg?.content || 'Belum ada pesan',
            unread: unreadCount,
            time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            rawTime: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
            isOfficial
          };
        });
      
      processedContacts.sort((a, b) => {
        if (a.isOfficial && !b.isOfficial) return -1;
        if (!a.isOfficial && b.isOfficial) return 1;
        return b.rawTime - a.rawTime;
      });
      
      setContacts(processedContacts);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (target: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_email.eq.${userEmail.toLowerCase()},receiver_email.eq.${target.toLowerCase()}),and(sender_email.eq.${target.toLowerCase()},receiver_email.eq.${userEmail.toLowerCase()})`)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
    else setMessages([]);
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUser) return;
    const msgContent = input;
    setInput('');
    
    // Background forward to Telegram
    sendTelegramForward(msgContent, selectedUser);

    try {
      const { error } = await supabase.from('direct_messages').insert([{
        sender_email: userEmail.toLowerCase(),
        receiver_email: selectedUser.toLowerCase(),
        content: msgContent,
        is_read: false
      }]);
      if (error) throw error;
      fetchContactsAndHistory();
    } catch (e) { console.error(e); }
  };

  const deleteMessage = async (id: string | number) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('direct_messages').delete().eq('id', id);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== id));
      fetchContactsAndHistory();
    } catch (e) { console.error(e); }
    finally { setIsDeleting(null); }
  };

  const clearAllMessages = async () => {
    if (!selectedUser) return;
    if (!confirm(`Hapus permanen seluruh riwayat dengan ${selectedUser.split('@')[0]}?`)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_email.eq.${userEmail.toLowerCase()},receiver_email.eq.${selectedUser.toLowerCase()}),and(sender_email.eq.${selectedUser.toLowerCase()},receiver_email.eq.${userEmail.toLowerCase()})`);
      if (error) throw error;
      setMessages([]);
      fetchContactsAndHistory();
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const filteredContacts = contacts.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeContact = contacts.find(c => c.email.toLowerCase() === selectedUser?.toLowerCase());

  return (
    <div className="flex h-[calc(100vh-140px)] gap-0 lg:gap-4 max-w-6xl mx-auto overflow-hidden">
      <div className={`${selectedUser && window.innerWidth < 1024 ? 'hidden' : 'flex'} w-full lg:w-80 glass-panel rounded-none lg:rounded-[2.5rem] bg-[#0e1621] border-white/5 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-white/5 bg-[#17212b]">
          <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Identity Hub</h3>
          <div className="mt-4 relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"></i>
            <input 
              type="text" 
              placeholder="Search user nodes..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/30 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredContacts.length > 0 ? filteredContacts.map(c => (
            <button 
              key={c.email} 
              onClick={() => { setSelectedUser(c.email); fetchMessages(c.email); markAsRead(c.email); }}
              className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${selectedUser === c.email ? 'bg-[#2b5278] border-transparent' : (c.isOfficial ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-white/[0.03]')} border ${c.isOfficial && selectedUser !== c.email ? 'border-cyan-500/10' : 'border-transparent'}`}
            >
              <div className="relative">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-inner italic ${selectedUser === c.email ? 'bg-cyan-400/20' : (c.isOfficial ? 'bg-gradient-to-br from-cyan-600 to-cyan-900 border border-cyan-400/30' : 'bg-gradient-to-br from-slate-800 to-slate-900')}`}>
                  {c.isOfficial ? <i className="fa-solid fa-shield-halved text-xs"></i> : c.email.charAt(0).toUpperCase()}
                </div>
                {c.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-black text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#0e1621] animate-bounce">
                    {c.unread}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <p className={`text-[10px] font-black truncate uppercase tracking-tighter ${c.isOfficial ? 'text-cyan-400' : 'text-white'}`}>
                      {c.isOfficial ? 'Admin Satmoko' : (c.full_name ? (c.full_name.includes('(') ? c.full_name.split(' ')[0] : c.full_name) : c.email.split('@')[0])}
                    </p>
                    {c.isOfficial && <i className="fa-solid fa-circle-check text-cyan-500 text-[8px]"></i>}
                  </div>
                  <span className={`text-[7px] font-bold ${selectedUser === c.email ? 'text-white/60' : 'text-slate-600'}`}>{c.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.isOfficial && <span className="text-[6px] font-black bg-cyan-500 text-black px-1 rounded uppercase tracking-tighter">Support</span>}
                  <p className={`text-[9px] truncate italic ${c.unread > 0 ? 'text-cyan-400 font-bold' : (selectedUser === c.email ? 'text-white/80' : 'text-slate-500')}`}>
                    {c.lastMsg}
                  </p>
                </div>
              </div>
            </button>
          )) : <div className="h-full flex flex-col items-center justify-center opacity-10 p-8 text-center"><i className="fa-solid fa-user-slash text-4xl mb-3"></i><p className="text-[8px] font-black uppercase tracking-widest">No Node Detected</p></div>}
        </div>
      </div>

      <div className={`${!selectedUser && window.innerWidth < 1024 ? 'hidden' : 'flex'} flex-1 glass-panel rounded-none lg:rounded-[3rem] bg-[#17212b] border-white/5 flex flex-col overflow-hidden relative`}>
        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-[#17212b]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-5">
            {selectedUser && <button onClick={() => setSelectedUser(null)} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 border border-white/5"><i className="fa-solid fa-chevron-left text-xs"></i></button>}
            {!selectedUser && <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 border border-white/5"><i className="fa-solid fa-chevron-left text-xs"></i></button>}
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm italic shadow-lg ${activeContact?.isOfficial ? 'bg-cyan-600' : 'bg-[#2b5278]'}`}>
                {activeContact?.isOfficial ? <i className="fa-solid fa-shield-halved"></i> : (selectedUser ? selectedUser.charAt(0).toUpperCase() : '?')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[13px] font-black text-white uppercase tracking-tighter italic">
                    {selectedUser ? (activeContact?.isOfficial ? 'Admin Satmoko' : (activeContact?.full_name ? activeContact.full_name.split(' ')[0] : selectedUser.split('@')[0])) : 'Signal Terminal'}
                  </h4>
                  {activeContact?.isOfficial && <i className="fa-solid fa-circle-check text-cyan-400 text-[9px]"></i>}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedUser ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{selectedUser ? (activeContact?.isOfficial ? 'Admin Node Online' : 'P2P Connection Active') : 'Scanning...'}</span>
                </div>
              </div>
            </div>
          </div>
          {selectedUser && (
            <button onClick={clearAllMessages} title="Clear Context" className="w-10 h-10 rounded-xl hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all flex items-center justify-center border border-transparent hover:border-red-500/20">
              <i className="fa-solid fa-broom-wide text-xs"></i>
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
          <AnimatePresence initial={false}>
            {selectedUser ? (
              messages.length > 0 ? (
                messages.map((m, i) => {
                  const isMe = m.sender_email.toLowerCase() === userEmail.toLowerCase();
                  return (
                    <motion.div key={m.id || i} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 max-w-[85%] lg:max-w-[70%]`}>
                        <div className="flex items-end gap-2">
                          {!isMe && <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 text-slate-600 hover:text-red-500"><i className="fa-solid fa-trash-can text-[8px]"></i></button>}
                          <div className={`p-4 rounded-2xl shadow-xl relative ${isMe ? 'bg-[#2b5278] text-white rounded-tr-none' : 'bg-[#182533] text-slate-100 border border-white/5 rounded-tl-none'}`}>
                            <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-2">
                              <span className="text-[7px] font-black uppercase tracking-tighter opacity-30">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && <div className="flex items-center text-[8px]">{m.is_read ? <i className="fa-solid fa-check-double text-cyan-400"></i> : <i className="fa-solid fa-check text-slate-500"></i>}</div>}
                            </div>
                          </div>
                          {isMe && <button onClick={() => deleteMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 text-slate-600 hover:text-red-500"><i className="fa-solid fa-trash-can text-[8px]"></i></button>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : <div className="h-full flex flex-col items-center justify-center opacity-10"><i className="fa-solid fa-paper-plane text-5xl mb-4"></i><p className="text-[10px] font-black uppercase tracking-[0.4em]">Broadcasting ready.</p></div>
            ) : <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-10"><i className="fa-solid fa-network-wired text-6xl"></i><p className="text-[10px] font-black uppercase tracking-[0.6em]">Select node to start</p></div>}
          </AnimatePresence>
        </div>

        {selectedUser && (
          <div className="p-6 bg-[#17212b] border-t border-white/5">
            <div className="flex gap-4 p-2 bg-black/20 rounded-[2rem] border border-white/5 focus-within:border-cyan-500/30 transition-all group">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={activeContact?.isOfficial ? "Encrypted line to Admin Satmoko..." : `Message node ${selectedUser.split('@')[0]}...`} className="flex-1 bg-transparent px-6 py-4 focus:outline-none text-sm text-white placeholder-slate-700 font-medium" />
              <button onClick={sendMessage} disabled={!input.trim()} className="w-12 h-12 rounded-full bg-[#2b5278] text-white hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center disabled:opacity-20 shadow-2xl active:scale-90"><i className="fa-solid fa-paper-plane text-xs"></i></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
