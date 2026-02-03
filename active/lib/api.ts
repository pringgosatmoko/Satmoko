
import { createClient } from '@supabase/supabase-js';

// Ambil env dengan prioritas Vite -> Process (Vercel) -> Default
const getEnv = () => {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = (typeof window !== 'undefined' && (window as any).process?.env) || {};
  
  return {
    URL: metaEnv.VITE_DATABASE_URL || processEnv.VITE_DATABASE_URL || "",
    ANON: metaEnv.VITE_SUPABASE_ANON || processEnv.VITE_SUPABASE_ANON || metaEnv.VITE_SUPABASE_ANON_KEY || ""
  };
};

const env = getEnv();

// Inisialisasi Client (Akan throw error jika URL benar-benar kosong, membantu debugging)
if (!env.URL) {
  console.warn("CRITICAL: VITE_DATABASE_URL tidak terdeteksi. Pastikan file .env atau Dashboard Hosting sudah diisi.");
}

export const supabase = createClient(
  env.URL || "https://placeholder-project.supabase.co", 
  env.ANON || "placeholder-anon-key"
);

export const PLANS = [
  { id: 'starter', label: 'Starter', price: 100000, credits: 1000, days: 30 },
  { id: 'pro', label: 'Pro', price: 250000, credits: 3500, days: 90 },
  { id: 'master', label: 'Master', price: 900000, credits: 15000, days: 365 }
];

export const isAdmin = (email: string) => {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = (typeof window !== 'undefined' && (window as any).process?.env) || {};
  const adminList = (metaEnv.VITE_ADMIN_EMAILS || processEnv.VITE_ADMIN_EMAILS || "").toLowerCase().split(',');
  return email && adminList.includes(email.toLowerCase());
};

export const getAdminPassword = () => {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = (typeof window !== 'undefined' && (window as any).process?.env) || {};
  return metaEnv.VITE_PASSW || processEnv.VITE_PASSW || "admin123";
};

export const getUserCredits = async (email: string) => {
  if (isAdmin(email)) return 999999;
  try {
    const { data } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).maybeSingle();
    return data?.credits || 0;
  } catch (e) { return 0; }
};

export const deductCredits = async (email: string, amount: number) => {
  if (isAdmin(email)) return true;
  const current = await getUserCredits(email);
  if (current < amount) return false;
  const { error } = await supabase.from('members').update({ credits: current - amount }).eq('email', email.toLowerCase());
  return !error;
};

// Gemini API Rotation
let currentKeyIndex = 1;
export const getActiveApiKey = () => {
  const metaEnv = (import.meta as any).env || {};
  const keys = [metaEnv.VITE_GEMINI_API_1, metaEnv.VITE_GEMINI_API_2, metaEnv.VITE_GEMINI_API_3].filter(Boolean);
  if (keys.length === 0) return process.env.API_KEY || "";
  return keys[(currentKeyIndex - 1) % keys.length];
};

export const rotateApiKey = () => {
  currentKeyIndex++;
};

// Added missing exports to fix module errors across the application

/**
 * Fetches system-wide settings from the Supabase 'settings' table.
 */
export const getSystemSettings = async () => {
  try {
    const { data } = await supabase.from('settings').select('*');
    const settings: Record<string, any> = {};
    data?.forEach(s => {
      settings[s.key] = s.value;
    });
    // Fallback defaults for critical costs
    return {
      cost_image: Number(settings.cost_image) || 25,
      cost_video: Number(settings.cost_video) || 150,
      cost_voice: Number(settings.cost_voice) || 150,
      cost_studio: Number(settings.cost_studio) || 600,
      ...settings
    };
  } catch (e) {
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  }
};

/**
 * Updates a single system configuration value in the Supabase 'settings' table.
 */
export const updateSystemSetting = async (key: string, value: any) => {
  const { error } = await supabase.from('settings').upsert({ key, value: value.toString() });
  return { error };
};

/**
 * Triggers a Telegram notification via a serverless function proxy.
 */
export const sendTelegramNotification = async (message: string) => {
  try {
    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  } catch (e) {
    console.error("Telegram notification failed", e);
  }
};

/**
 * Determines if a user is considered 'online' based on their last seen timestamp.
 */
export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  // Threshold of 5 minutes for online status
  return (now - lastSeenDate) < (5 * 60 * 1000);
};

/**
 * Approves a manual topup request, updating the request status and credit balance.
 */
export const approveTopup = async (id: number, email: string, amount: number) => {
  // Update the request status to approved
  const { error: reqError } = await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', id);
  if (reqError) return false;

  // Update the user's credit balance
  const current = await getUserCredits(email);
  const { error: memError } = await supabase.from('members').update({ 
    credits: Number(current) + Number(amount),
    status: 'active'
  }).eq('email', email.toLowerCase());

  if (!memError) {
    sendTelegramNotification(`✅ TOPUP BERHASIL\nEmail: ${email}\nJumlah: ${amount} CR`);
    return true;
  }
  return false;
};

/**
 * Allows administrators to manually set the credit balance for a member.
 */
export const manualUpdateCredits = async (email: string, credits: number) => {
  const { error } = await supabase.from('members').update({ credits }).eq('email', email.toLowerCase());
  return !error;
};

/**
 * Returns diagnostic information about the available Gemini API key slots.
 */
export const auditApiKeys = () => {
  const metaEnv = (import.meta as any).env || {};
  return {
    slot1: !!metaEnv.VITE_GEMINI_API_1,
    slot2: !!metaEnv.VITE_GEMINI_API_2,
    slot3: !!metaEnv.VITE_GEMINI_API_3,
    activeSlot: currentKeyIndex
  };
};

/**
 * Records a new manual topup request with proof of payment.
 */
export const requestTopup = async (email: string, amount: number, price: number, receipt: string) => {
  const tid = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { error } = await supabase.from('topup_requests').insert([{
    tid,
    email: email.toLowerCase(),
    amount,
    price,
    receipt_url: receipt,
    status: 'pending'
  }]);
  
  if (!error) {
    sendTelegramNotification(`💰 REQUEST TOPUP\nEmail: ${email}\nJumlah: ${amount} CR\nID: ${tid}`);
    return { success: true, tid };
  }
  return { success: false, tid: '' };
};
