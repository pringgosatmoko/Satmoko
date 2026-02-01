
import { createClient } from '@supabase/supabase-js';

// Access environment variables directly. 
// Vite's 'define' will replace these with string literals during build.
const supabaseUrl = process.env.VITE_DATABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON || '';

// Initialize Supabase Client
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Administrative privilege check
export const isAdmin = (email: string) => {
  if (!email) return false;
  return email.toLowerCase() === 'pringgosatmoko@gmail.com';
};

// Password Admin Master
export const getAdminPassword = () => 'MASTER2025';

// No-op for API key rotation
export const rotateApiKey = () => {
  console.log("[System] API key management is now handled exclusively via process.env.API_KEY.");
};

// System health audit
export const auditApiKeys = () => {
  return {
    db: !!supabase,
    ai: !!process.env.API_KEY,
    telegram: !!process.env.VITE_TELEGRAM_BOT_TOKEN
  };
};

// Send notifications via Telegram bot
export const sendTelegramNotification = async (text: string) => {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VITE_TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) return;

  try {
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    }).catch(() => {});
  } catch (e) {}
};

// Log generic activity
export const logActivity = async (action: string, details: string) => {
  const text = `🛠️ *ACTIVITY LOG*\n*Action:* ${action}\n*Details:* ${details}\n*Time:* ${new Date().toLocaleString()}`;
  console.log(`[ACTIVITY] ${action}: ${details}`);
  await sendTelegramNotification(text);
};

// Deduct credits from user balance
export const deductCredits = async (email: string, amount: number) => {
  if (!supabase) return false;
  try {
    const { data: member } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    if (member && (member.credits || 0) >= amount) {
      const { error } = await supabase.from('members').update({ credits: member.credits - amount }).eq('email', email.toLowerCase());
      if (!error) {
        logActivity('CREDIT_DEDUCTION', `User ${email} deducted ${amount} CR`);
      }
      return !error;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Fetch global system configuration
export const getSystemSettings = async () => {
  if (!supabase) return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  try {
    const { data } = await supabase.from('system_settings').select('*');
    const settings: Record<string, any> = {
      cost_image: 25,
      cost_video: 150,
      cost_voice: 150,
      cost_studio: 600
    };
    data?.forEach(s => { settings[s.key] = s.value; });
    return settings;
  } catch (e) {
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  }
};

// Update specific system settings
export const updateSystemSetting = async (key: string, value: number) => {
  if (!supabase) return { error: new Error("Database not connected") };
  logActivity('SYSTEM_SETTING_CHANGE', `Setting ${key} changed to ${value}`);
  return await supabase.from('system_settings').upsert({ key, value });
};

// Check online status
export const isUserOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  const last = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  return (now - last) < 300000;
};

// Update member status
export const updateMemberStatus = async (email: string, status: string, validUntil?: string) => {
  if (!supabase) return false;
  const update: any = { status };
  if (validUntil) update.valid_until = validUntil;
  const { error } = await supabase.from('members').update(update).eq('email', email.toLowerCase());
  if (!error) {
    logActivity('MEMBER_STATUS_UPDATE', `User ${email} status changed to ${status}`);
  }
  return !error;
};

// Member management
export const deleteMember = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  return !error;
};

export const suspendMember = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').update({ status: 'inactive' }).eq('email', email.toLowerCase());
  return !error;
};

export const extendMember = async (email: string) => {
  if (!supabase) return false;
  try {
    const { data: member } = await supabase.from('members').select('valid_until').eq('email', email.toLowerCase()).single();
    let newDate = member?.valid_until ? new Date(member.valid_until) : new Date();
    newDate.setDate(newDate.getDate() + 30);
    const { error } = await supabase.from('members').update({ valid_until: newDate.toISOString() }).eq('email', email.toLowerCase());
    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteAccountPermanently = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  return !error;
};

// Topup logic
export const requestTopup = async (email: string, amount: number, price: number, receiptUrl: string) => {
  if (!supabase) return { success: false, tid: 'ERROR' };
  const tid = `TOP-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
  const { error } = await supabase.from('topup_requests').insert({
    email: email.toLowerCase(), amount, price, receipt_url: receiptUrl, tid, status: 'pending'
  });
  return { success: !error, tid };
};

export const getPendingTopups = async () => {
  if (!supabase) return [];
  const { data } = await supabase.from('topup_requests').select('*').eq('status', 'pending');
  return data || [];
};

export const approveTopup = async (id: number) => {
  if (!supabase) return false;
  try {
    const { data: req } = await supabase.from('topup_requests').select('*').eq('id', id).single();
    if (!req) return false;
    
    const { data: member } = await supabase.from('members').select('credits').eq('email', req.email).single();
    if (member) {
      await supabase.from('members').update({ credits: (member.credits || 0) + req.amount }).eq('email', req.email);
      await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', id);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const processMidtransTopup = async (email: string, credits: number, orderId: string) => {
  if (!supabase) return false;
  try {
    const { data: member } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    if (member) {
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('members').update({ 
        credits: (member.credits || 0) + credits,
        status: 'active',
        valid_until: validUntil
      }).eq('email', email.toLowerCase());
      
      logActivity('PAYMENT_SETTLED', `User ${email} activated with ${credits} CR via order ${orderId}`);
      return !error;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const createMidtransToken = async (email: string, credits: number, price: number, customOrderId?: string) => {
  const orderId = customOrderId || `SAT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  try {
    const response = await fetch('/api/midtrans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, credits, price, orderId })
    });
    if (!response.ok) return { token: null, orderId };
    const data = await response.json();
    return { token: data.token, orderId };
  } catch (e) {
    return { token: null, orderId };
  }
};
