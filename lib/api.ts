
import { createClient } from '@supabase/supabase-js';

// Helper untuk mengambil environment variable di Vite (client-side) maupun Node (edge-side)
const getEnv = (name: string): string => {
  // 1. Cek window.process.env (Polyfilled di index.tsx / Injeksi AI Studio)
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const val = (window as any).process.env[name];
    if (val) return val;
  }

  // 2. Cek process.env (Node/Edge runtime)
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[name];
    if (val) return val;
  }

  // 3. Cek import.meta.env (Standar Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Akses dinamis
    const val = import.meta.env[name];
    if (val) return val;

    // Manual static replacement check (Penting untuk Vercel Production)
    if (name === 'VITE_DATABASE_URL') return import.meta.env.VITE_DATABASE_URL;
    if (name === 'VITE_SUPABASE_ANON') return import.meta.env.VITE_SUPABASE_ANON;
    if (name === 'VITE_API_KEY') return import.meta.env.VITE_API_KEY;
    if (name === 'GEMINI_API_KEY') return import.meta.env.GEMINI_API_KEY;
    if (name === 'VITE_GEMINI_API_KEY') return import.meta.env.VITE_GEMINI_API_KEY;
    if (name === 'API_KEY') return import.meta.env.API_KEY;
    if (name === 'VITE_TELEGRAM_BOT_TOKEN') return import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (name === 'VITE_TELEGRAM_CHAT_ID') return import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (name === 'VITE_GEMINI_API_1') return import.meta.env.VITE_GEMINI_API_1;
    if (name === 'VITE_GEMINI_API_2') return import.meta.env.VITE_GEMINI_API_2;
    if (name === 'VITE_GEMINI_API_3') return import.meta.env.VITE_GEMINI_API_3;
    if (name === 'VITE_ADMIN_EMAILS') return import.meta.env.VITE_ADMIN_EMAILS;
    if (name === 'VITE_PASSW') return import.meta.env.VITE_PASSW;
  }

  // 4. Cek versi prefix VITE_ jika belum ada
  if (!name.startsWith('VITE_')) {
    const viteName = `VITE_${name}`;
    // Hindari loop tak terbatas dengan cek eksplisit
    if (viteName === 'VITE_API_KEY' || viteName === 'VITE_DATABASE_URL') {
      return getEnv(viteName);
    }
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
  const adminEmails = getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com';
  const admins = adminEmails.split(',').map(e => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
};

// Password Admin Master
export const getAdminPassword = () => getEnv('VITE_PASSW') || 'satmoko123';

// State for API key rotation
let currentApiKeyIndex = 0;

// API Key retrieval for GenAI interactions
export const getActiveApiKey = () => {
  // 1. Prioritas Utama: Injeksi AI Studio (window.process.env)
  if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
    return (window as any).process.env.API_KEY;
  }

  // 2. Cek via slot rotasi (VITE_GEMINI_API_1, 2, 3)
  const slots = ['VITE_GEMINI_API_1', 'VITE_GEMINI_API_2', 'VITE_GEMINI_API_3'];
  const rotatedKey = getEnv(slots[currentApiKeyIndex]);
  if (rotatedKey) return rotatedKey;

  // 3. Fallback exhaustive search
  const fallback = getEnv('VITE_API_KEY') ||
                   getEnv('VITE_GEMINI_API_KEY') ||
                   getEnv('GEMINI_API_KEY') ||
                   getEnv('API_KEY') ||
                   getEnv('VITE_GEMINI_API_1'); // Re-check slot 1 as last resort

  if (fallback) return fallback;

  // 4. Direct access untuk Vite build-time replacement (Vercel safety)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_GEMINI_API_1 ||
           import.meta.env.VITE_API_KEY ||
           import.meta.env.VITE_GEMINI_API_KEY ||
           import.meta.env.GEMINI_API_KEY ||
           import.meta.env.API_KEY ||
           '';
  }

  return '';
};

// Rotate API Key slot
export const rotateApiKey = () => {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % 3;
  console.log(`Rotating to API Key Slot ${currentApiKeyIndex + 1}`);
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

// Verify the status of a Midtrans payment
export const verifyMidtransPayment = async (orderId: string) => {
  try {
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    return await res.json();
  } catch (e) {
    return { isPaid: false };
  }
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
    // 1. Check if already processed (Idempotency)
    const { data: request } = await supabase
      .from('topup_requests')
      .select('status')
      .eq('tid', orderId)
      .maybeSingle();

    if (request && request.status === 'approved') {
      console.log(`[IDEMPOTENCY] Order ${orderId} already processed.`);
      // Pastikan status member tetap active jika request sudah approve
      await supabase.from('members').update({ status: 'active' }).eq('email', email.toLowerCase());
      return true;
    }

    const { data: member } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).single();
    if (member) {
      // 2. Apply credits and update status
      const { error } = await supabase.from('members').update({ 
        credits: (member.credits || 0) + credits,
        status: 'active'
      }).eq('email', email.toLowerCase());

      if (!error) {
        // 3. Mark request as approved to prevent double crediting
        await supabase.from('topup_requests').update({ status: 'approved' }).eq('tid', orderId);
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
