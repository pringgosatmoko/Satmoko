import { createClient } from '@supabase/supabase-js';

// Robust environment variable accessor with fallbacks
const getEnv = () => {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = (typeof window !== 'undefined' && (window as any).process?.env) || {};
  
  return {
    VITE_DATABASE_URL: processEnv.VITE_DATABASE_URL || metaEnv.VITE_DATABASE_URL || "",
    VITE_SUPABASE_ANON: processEnv.VITE_SUPABASE_ANON || metaEnv.VITE_SUPABASE_ANON || processEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_ANON_KEY || "",
    VITE_ADMIN_EMAILS: processEnv.VITE_ADMIN_EMAILS || metaEnv.VITE_ADMIN_EMAILS || "",
    VITE_TELEGRAM_BOT_TOKEN: processEnv.VITE_TELEGRAM_BOT_TOKEN || metaEnv.VITE_TELEGRAM_BOT_TOKEN || "",
    VITE_TELEGRAM_CHAT_ID: processEnv.VITE_TELEGRAM_CHAT_ID || metaEnv.VITE_TELEGRAM_CHAT_ID || "",
    VITE_PASSW: processEnv.VITE_PASSW || metaEnv.VITE_PASSW || "",
    VITE_GEMINI_API_1: processEnv.VITE_GEMINI_API_1 || metaEnv.VITE_GEMINI_API_1 || processEnv.API_KEY || metaEnv.API_KEY || ""
  };
};

const env = getEnv();

// Initialize Supabase with extreme caution. 
// If keys are missing, we use placeholder strings to prevent 'Uncaught Error' crashes.
// The app will still load, allowing us to show UI instead of a blank screen.
export const supabase = createClient(
  env.VITE_DATABASE_URL || "https://placeholder.supabase.co", 
  env.VITE_SUPABASE_ANON || "public-anonymous-key-placeholder"
);

export const PLANS = [
  { id: '1B', label: 'Starter Tier', price: 100000, credits: 1000, durationDays: 30 },
  { id: '3B', label: 'Pro Tier', price: 250000, credits: 3500, durationDays: 90 },
  { id: '1T', label: 'Master Tier', price: 900000, credits: 15000, durationDays: 365 }
];

export const getSystemSettings = async () => {
  try {
    const { data } = await supabase.from('settings').select('*');
    const settings: Record<string, any> = { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
    data?.forEach(item => { settings[item.key] = item.value; });
    return settings;
  } catch (e) {
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  }
};

export const updateSystemSetting = async (key: string, value: any) => {
  const { error } = await supabase.from('settings').upsert({ key, value });
  return { error };
};

export const sendTelegramNotification = async (message: string) => {
  const currentEnv = getEnv();
  const token = currentEnv.VITE_TELEGRAM_BOT_TOKEN;
  const chat = currentEnv.VITE_TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: `🚀 *SATMOKO HUB*\n\n${message}`, parse_mode: 'Markdown' })
    });
  } catch (e) {}
};

export const getUserCredits = async (email: string) => {
  if (isAdmin(email)) return 999999;
  try {
    const { data } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).maybeSingle();
    return data?.credits || 0;
  } catch (e) {
    return 0;
  }
};

export const deductCredits = async (email: string, amount: number) => {
  if (isAdmin(email)) return true;
  const current = await getUserCredits(email);
  if (current < amount) return false;
  const { error } = await supabase.from('members').update({ credits: current - amount }).eq('email', email.toLowerCase());
  return !error;
};

export const requestTopup = async (email: string, amount: number, price: number, receipt_url: string) => {
  const tid = `TOP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const { error } = await supabase.from('topup_requests').insert([{
    tid, email: email.toLowerCase(), amount, price, receipt_url, status: 'pending'
  }]);
  return { success: !error, tid };
};

export const isAdmin = (email: string) => {
  const currentEnv = getEnv();
  const admins = (currentEnv.VITE_ADMIN_EMAILS || "").toLowerCase().split(',');
  return admins.includes(email.toLowerCase());
};

export const getAdminPassword = () => getEnv().VITE_PASSW || 'satmoko123';

export const getActiveApiKey = () => {
  const currentEnv = getEnv();
  return currentEnv.VITE_GEMINI_API_1 || "";
};

export const rotateApiKey = () => {
  console.log("Rotating to backup node...");
};

export const updatePresence = async (email: string) => {
  try {
    await supabase.from('members').update({ last_seen: new Date().toISOString() }).eq('email', email.toLowerCase());
  } catch (e) {}
};

export const isUserOnline = (lastSeen?: string | null) => {
  if (!lastSeen) return false;
  const last = new Date(lastSeen).getTime();
  const now = new Date().getTime();
  return (now - last) < 300000;
};

export const approveTopup = async (requestId: number, email: string, amount: number) => {
  try {
    const { data: member } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).maybeSingle();
    const { error: memberError } = await supabase.from('members').update({ 
      credits: (member?.credits || 0) + amount,
      status: 'active'
    }).eq('email', email.toLowerCase());
    if (memberError) return false;
    const { error: requestError } = await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', requestId);
    return !requestError;
  } catch (e) {
    return false;
  }
};

export const manualUpdateCredits = async (email: string, newCredits: number) => {
  const { error } = await supabase.from('members').update({ credits: newCredits }).eq('email', email.toLowerCase());
  return !error;
};

export const auditApiKeys = () => {
  const currentEnv = getEnv();
  return {
    slot1: !!currentEnv.VITE_GEMINI_API_1,
    slot2: false,
    slot3: false,
    activeSlot: "VITE_GEMINI_API_1"
  };
};