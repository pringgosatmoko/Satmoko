
import { createClient } from '@supabase/supabase-js';

// Helper untuk mengambil environment variable di Vite (client-side) maupun Node (edge-side)
const getEnv = (name: string): string => {
  // Prioritas 1: process.env (Injeksi langsung)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] || '';
  }
  // Prioritas 2: import.meta.env (Standar Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    // @ts-ignore
    return import.meta.env[name];
  }
  // Prioritas 3: Versi prefix VITE_ jika ada
  const viteName = `VITE_${name}`;
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteName]) {
    // @ts-ignore
    return import.meta.env[viteName];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_DATABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON');

// Inisialisasi Supabase Client
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as any;

// Administrative privilege check
export const isAdmin = (email: string) => {
  if (!email) return false;
  return email.toLowerCase() === 'pringgosatmoko@gmail.com';
};

// Password Admin Master
export const getAdminPassword = () => 'MASTER2025';

// API Key retrieval for GenAI interactions
export const getActiveApiKey = () => {
  // Cek API_KEY (Persyaratan Sistem) dan VITE_API_KEY (Vite Compatibility)
  return getEnv('API_KEY') || getEnv('VITE_API_KEY') || '';
};

// Simulate API key rotation
export const rotateApiKey = () => {
  console.log("Rotating API Key... (Internal slots shifted)");
};

// System health audit
export const auditApiKeys = () => {
  const activeKey = getActiveApiKey();
  return {
    db: !!supabase,
    slot1: !!activeKey,
    slot2: false, 
    slot3: false, 
    telegram: !!getEnv('VITE_TELEGRAM_BOT_TOKEN'),
    activeSlot: 1
  };
};

// Send notifications via Telegram bot
export const sendTelegramNotification = async (text: string) => {
  const botToken = getEnv('VITE_TELEGRAM_BOT_TOKEN');
  const chatId = getEnv('VITE_TELEGRAM_CHAT_ID');
  if (!botToken || !chatId) {
    console.warn("Telegram Config Missing:", { botToken: !!botToken, chatId: !!chatId });
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
  } catch (e) {
    console.error("Telegram Error:", e);
  }
};

// Log generic activity to Telegram
export const logActivity = async (action: string, details: string) => {
  const text = `🛠️ *ACTIVITY LOG*\n*Action:* ${action}\n*Details:* ${details}\n*Time:* ${new Date().toLocaleString()}`;
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

// Fetch global system configuration and feature costs
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

// Check if a user is currently considered online
export const isUserOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  const last = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  return (now - last) < 300000; // Active within the last 5 minutes
};

// Update a member's status and validity
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

// Permanently remove a member
export const deleteMember = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  if (!error) {
    logActivity('MEMBER_DELETED', `User ${email} has been removed from database`);
  }
  return !error;
};

// Suspend a member's access
export const suspendMember = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').update({ status: 'inactive' }).eq('email', email.toLowerCase());
  if (!error) {
    logActivity('MEMBER_SUSPENDED', `User ${email} suspended`);
  }
  return !error;
};

// Extend a member's subscription by 30 days
export const extendMember = async (email: string) => {
  if (!supabase) return false;
  try {
    const { data: member } = await supabase.from('members').select('valid_until').eq('email', email.toLowerCase()).single();
    let newDate = member?.valid_until ? new Date(member.valid_until) : new Date();
    newDate.setDate(newDate.getDate() + 30);
    const { error } = await supabase.from('members').update({ valid_until: newDate.toISOString() }).eq('email', email.toLowerCase());
    if (!error) {
      logActivity('MEMBER_EXTENSION', `User ${email} extended by 30 days`);
    }
    return !error;
  } catch (e) {
    return false;
  }
};

// Delete account data permanently
export const deleteAccountPermanently = async (email: string) => {
  if (!supabase) return false;
  const { error } = await supabase.from('members').delete().eq('email', email.toLowerCase());
  if (!error) {
    logActivity('ACCOUNT_PERMANENT_DELETE', `User ${email} deleted their own account`);
  }
  return !error;
};

// Handle manual topup requests
export const requestTopup = async (email: string, amount: number, price: number, receiptUrl: string) => {
  if (!supabase) return { success: false, tid: 'ERROR' };
  const tid = `TOP-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
  const { error } = await supabase.from('topup_requests').insert({
    email: email.toLowerCase(), amount, price, receipt_url: receiptUrl, tid, status: 'pending'
  });
  if (!error) {
    logActivity('TOPUP_REQUESTED_MANUAL', `User ${email} requested ${amount} CR (Rp ${price})`);
  }
  return { success: !error, tid };
};

// Fetch pending topup requests for admin approval
export const getPendingTopups = async () => {
  if (!supabase) return [];
  const { data } = await supabase.from('topup_requests').select('*').eq('status', 'pending');
  return data || [];
};

// Approve a topup request and update user credits
export const approveTopup = async (id: number) => {
  if (!supabase) return false;
  try {
    const { data: req } = await supabase.from('topup_requests').select('*').eq('id', id).single();
    if (!req) return false;
    
    const { data: member } = await supabase.from('members').select('credits').eq('email', req.email).single();
    if (member) {
      await supabase.from('members').update({ credits: (member.credits || 0) + req.amount }).eq('email', req.email);
      await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', id);
      logActivity('TOPUP_APPROVED', `Admin approved topup for ${req.email}: +${req.amount} CR`);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Update user credits after successful Midtrans payment
export const processMidtransTopup = async (email: string, credits: number, orderId: string) => {
  if (!supabase) return false;
  try {
    const { data: member } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    if (member) {
      const { error } = await supabase.from('members').update({ 
        credits: (member.credits || 0) + credits,
        status: 'active'
      }).eq('email', email.toLowerCase());
      if (!error) {
        logActivity('TOPUP_PROCESSED_AUTO', `User ${email} auto topup ${credits} CR (Order: ${orderId})`);
      }
      return !error;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Generate a Midtrans Snap token for checkout
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
    logActivity('TOPUP_INITIATED_MIDTRANS', `User ${email} started payment process for ${credits} CR (Rp ${price})`);
    return { token: data.token, orderId };
  } catch (e) {
    return { token: null, orderId };
  }
};
