
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isUserOnline, updatePresence } from '../lib/api';

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
  last_seen?: string | null;
}

interface ContactType extends Member {
  lastMsg?: string;
  lastMsgTime?: string | null;
  unread: number;
  isOfficial?: boolean;
  rawTime?: number;
  isNew?: boolean;
  isOnline?: boolean;
  time: string;
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
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(initialTarget || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const msgSound = useMemo(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'), []);

  useEffect(() => {
    if (userEmail) updatePresence(userEmail);
  }, [userEmail]);

  useEffect(() => {
    fetchContactsAndHistory();
    const timer = setInterval(fetchContactsAndHistory, 8000);
    if (selectedUser) {
      fetchMessages(selectedUser);
      markAsRead(selectedUser);
    }
    return () => clearInterval(timer);
  }, [selectedUser, userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    const currentEmail = userEmail.toLowerCase();
    
    const channel = supabase
      .channel('chat-p2p-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, payload => {
        const newMessage = payload.new as Message;
        
        // Handle deletions
        if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as any).id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
          return;
        }

        if (!newMessage) return;

        const isToMe = newMessage.receiver_email?.toLowerCase() === currentEmail;
        const isFromMe = newMessage.sender_email?.toLowerCase() === currentEmail;
        
        if (isToMe || isFromMe) {
          const isFromSelected = selectedUser && newMessage.sender_email?.toLowerCase() === selectedUser.toLowerCase();
          const isMeSendingToSelected = selectedUser && isFromMe && newMessage.receiver_email?.toLowerCase() === selectedUser.toLowerCase();

          if (isFromSelected || isMeSendingToSelected) {
            if (payload.eventType === 'INSERT') {
              setMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              if (isToMe) {
                markAsRead(selectedUser!);
                msgSound.play().catch(() => {});
              }
            }
          } else if (isToMe && payload.eventType === 'INSERT') {
            msgSound.play().catch(() => {});
            fetchContactsAndHistory();
          }
        }
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
    if (!target || !userEmail) return;
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('receiver_email', userEmail.toLowerCase())
      .eq('sender_email', target.toLowerCase())
      .eq('is_read', false);
  };

  const getRelativeTime = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return "Offline";
    const last = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - last) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const fetchContactsAndHistory = async () => {
    if (!userEmail) return;
    const currentEmail = userEmail.toLowerCase();
    const currentAdminEmail = adminEmail.toLowerCase();

    try {
      const { data: membersRaw } = await supabase.from('members').select('*');
      const { data: lastMessages } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_email.eq.${currentEmail},receiver_email.eq.${currentEmail}`)
        .order('created_at', { ascending: false });

      const partnerEmails = new Set<string>();
      if (currentEmail !== currentAdminEmail) partnerEmails.add(currentAdminEmail);
      
      membersRaw?.forEach(m => {
        if (m.email.toLowerCase() !== currentEmail && m.status === 'active') partnerEmails.add(m.email.toLowerCase());
      });

      lastMessages?.forEach(m => {
        if (m.sender_email.toLowerCase() !== currentEmail) partnerEmails.add(m.sender_email.toLowerCase());
        if (m.receiver_email.toLowerCase() !== currentEmail) partnerEmails.add(m.receiver_email.toLowerCase());
      });

      const processedContacts: ContactType[] = Array.from(partnerEmails).map(email => {
        const memberInfo = membersRaw?.find(m => m.email.toLowerCase() === email);
        const history = lastMessages?.filter(m => 
          m.sender_email.toLowerCase() === email || 
          m.receiver_email.toLowerCase() === email
        );
        const lastMsg = history?.[0];
        const unreadCount = history?.filter(m => m.receiver_email.toLowerCase() === currentEmail && !m.is_read).length || 0;
        const onlineStatus = isUserOnline(memberInfo?.last_seen);
        
        return {
          email: email,
          full_name: memberInfo?.full_name || email.split('@')[0],
          status: memberInfo?.status || 'active',
          last_seen: memberInfo?.last_seen || null,
          lastMsg: lastMsg?.content || 'Klik untuk memulai P2P Chat',
          lastMsgTime: lastMsg?.created_at || null,
          isNew: !lastMsg,
          unread: unreadCount,
          time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          rawTime: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
          isOfficial: email === currentAdminEmail,
          isOnline: onlineStatus
        };
      });
      
      processedContacts.sort((a, b) => {
        if (b.unread !== a.unread) return b.unread - a.unread;
        if (b.isOnline !== a.isOnline) return b.isOnline ? 1 : -1;
        if (b.rawTime !== a.rawTime) return (b.rawTime || 0) - (a.rawTime || 0);
        return a.email.localeCompare(b.email);
      });
      
      setContacts(processedContacts);
    } catch (e) { 
      console.error("Contacts Sync Error:", e); 
    }
  };

  const fetchMessages = async (target: string) => {
    if (!userEmail || !target) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_email.eq.${userEmail.toLowerCase()},receiver_email.eq.${target.toLowerCase()}),and(sender_email.eq.${target.toLowerCase()},receiver_email.eq.${userEmail.toLowerCase()})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUser || !userEmail) return;
    const msg = input; setInput('');
    try {
      updatePresence(userEmail);
      const { error } = await supabase.from('direct_messages').insert([{
        sender_email: userEmail.toLowerCase(),
        receiver_email: selectedUser.toLowerCase(),
        content: msg,
        is_read: false
      }]);
      if (error) throw error;
      fetchContactsAndHistory();
    } catch (e) { console.error("Send Error:", e); }
  };

  const deleteMessage = async (id: string | number) => {
    if (!confirm("Master, hapus pesan ini secara permanen?")) return;
    try {
      const { error } = await supabase.from('direct_messages').delete().eq('id', id);
      if (error) throw error;
      // Realtime channel will handle the local state update
    } catch (e) { console.error("Delete Error:", e); }
  };

  const clearChatHistory = async () => {
    if (!selectedUser || !userEmail) return;
    if (!confirm(`Master, apakah Anda yakin ingin MENGHAPUS SELURUH riwayat chat dengan ${selectedUser}? Semua pesan akan hilang untuk kedua belah pihak.`)) return;
    
    try {
      setIsRefreshing(true);
      const { error } = await supabase
        .from('direct_messages')
        .or(`and(sender_email.eq.${userEmail.toLowerCase()},receiver_email.eq.${selectedUser.toLowerCase()}),and(sender_email.eq.${selectedUser.toLowerCase()},receiver_email.eq.${userEmail.toLowerCase()})`)
        .delete();
      
      if (error) throw error;
      setMessages([]);
      fetchContactsAndHistory();
    } catch (e) {
      console.error("Clear History Error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentContact = contacts.find(c => c.email.toLowerCase() === selectedUser?.toLowerCase());
  const isSelectedOnline = currentContact?.isOnline;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 max-w-6xl mx-auto overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl active:scale-95">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter leading-none">P2P <span className="text-cyan-400">Hub</span></h2>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 mt-1">Full Control Messaging Channel</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => { setIsRefreshing(true); fetchContactsAndHistory().then(() => setIsRefreshing(false)); }} className={`w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center transition-all ${isRefreshing ? 'animate-spin' : 'hover:bg-cyan-500 hover:text-black'}`}>
             <i className="fa-solid fa-rotate"></i>
           </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Sidebar Member Directory */}
        <div className={`${selectedUser && window.innerWidth < 1024 ? 'hidden' : 'flex'} w-full lg:w-80 glass-panel rounded-[2.5rem] bg-[#0e1621] border-white/5 flex flex-col overflow-hidden shadow-2xl`}>
          <div className="p-5">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]"></i>
              <input type="text" placeholder="Cari member aktif..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] text-white focus:outline-none focus:border-cyan-500/30 transition-all placeholder:text-slate-800" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
            {contacts.filter(c => c.email.includes(searchTerm) || (c.full_name && c.full_name.toLowerCase().includes(searchTerm.toLowerCase()))).map(c => {
              return (
                <button key={c.email} onClick={() => setSelectedUser(c.email)} className={`w-full p-4 rounded-[1.8rem] text-left transition-all flex items-center gap-4 mb-1 group relative ${selectedUser === c.email ? 'bg-cyan-500/10 border border-cyan-500/5' : 'hover:bg-white/5'}`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all ${c.isOnline ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/5'} ${selectedUser === c.email ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                       {c.isOfficial ? <i className="fa-solid fa-shield-halved"></i> : c.email.charAt(0).toUpperCase()}
                    </div>
                    {c.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0e1621] rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className={`text-[10px] font-black truncate uppercase tracking-tighter ${c.isOfficial ? 'text-cyan-400' : 'text-slate-200'}`}>{c.full_name}</p>
                      <span className="text-[7px] text-slate-600 font-bold">{c.isOnline ? 'Active' : (c.time || '')}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className={`text-[9px] truncate ${(c.unread ?? 0) > 0 ? 'text-white font-bold' : 'text-slate-600'}`}>{c.lastMsg}</p>
                      {(c.unread ?? 0) > 0 && <span className="min-w-[16px] h-[16px] bg-cyan-500 text-black text-[8px] font-black rounded-full flex items-center justify-center shadow-lg">{c.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Content Area */}
        <div className={`${!selectedUser && window.innerWidth < 1024 ? 'hidden' : 'flex'} flex-1 glass-panel rounded-[2.5rem] bg-[#17212b] border-white/5 flex flex-col overflow-hidden shadow-2xl relative`}>
          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/30 backdrop-blur-md relative z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedUser(null)} className="lg:hidden text-slate-400 hover:text-white"><i className="fa-solid fa-chevron-left"></i></button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-slate-800 border flex items-center justify-center text-[11px] font-black transition-all ${isSelectedOnline ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'border-white/5'} ${selectedUser?.toLowerCase() === adminEmail.toLowerCase() ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {selectedUser?.charAt(0).toUpperCase()}
                  </div>
                  {isSelectedOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212b] rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>}
                </div>
                <div>
                  <h4 className="text-[12px] font-black text-white uppercase italic tracking-widest leading-none">
                    {selectedUser ? (currentContact?.full_name || selectedUser.split('@')[0]) : 'Neural Interface'}
                  </h4>
                  {selectedUser && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isSelectedOnline ? 'text-green-400' : 'text-slate-500'}`}>
                        {isSelectedOnline ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                            ACTIVE NOW
                          </>
                        ) : (
                          `Seen ${getRelativeTime(currentContact?.last_seen)}`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {selectedUser && (
              <button 
                onClick={clearChatHistory} 
                className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg group"
                title="Hapus Seluruh Percakapan"
              >
                <i className="fa-solid fa-trash-can text-xs group-hover:animate-bounce"></i>
              </button>
            )}
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 relative z-10">
            {selectedUser ? (
              messages.map((m) => {
                const isMe = m.sender_email.toLowerCase() === userEmail.toLowerCase();
                // KONTROL PENUH: User bisa hapus pesannya sendiri DAN pesan orang lain.
                const canDelete = true;
                
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`relative max-w-[80%] p-3 px-4 rounded-[1.2rem] shadow-lg flex flex-col ${isMe ? 'bg-[#2b5278] text-white rounded-tr-none' : 'bg-[#182533] text-slate-100 rounded-tl-none border border-white/5'}`}>
                      <p className="text-[12px] leading-snug font-medium pr-6">{m.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                         <span className="text-[7px] font-bold uppercase">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         {isMe && <i className={`fa-solid fa-check-double text-[8px] ${m.is_read ? 'text-cyan-400' : 'text-slate-400'}`}></i>}
                      </div>
                      {canDelete && (
                        <button 
                          onClick={() => deleteMessage(m.id)} 
                          className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-all p-2 text-slate-700 hover:text-red-500`}
                          title="Hapus Pesan"
                        >
                          <i className="fa-solid fa-trash text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : <div className="h-full flex flex-col items-center justify-center opacity-10"><i className="fa-solid fa-user-group text-8xl mb-6"></i><p className="font-black uppercase tracking-[0.8em] text-xl">Member Directory</p></div>}
          </div>

          {selectedUser && (
            <div className="p-6 bg-black/40 border-t border-white/5 relative z-10">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-900/80 rounded-[1.5rem] border border-white/5 focus-within:border-cyan-500/50 transition-all px-5 py-1 flex items-center">
                  <textarea 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} 
                    placeholder="Tulis pesan pribadi..." 
                    className="flex-1 bg-transparent py-4 outline-none text-[12px] text-white placeholder:text-slate-800 resize-none max-h-32" 
                  />
                </div>
                <button onClick={sendMessage} disabled={!input.trim()} className="w-12 h-12 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-2xl transition-all hover:bg-cyan-500 active:scale-90">
                  <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
