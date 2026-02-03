
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  const win = window as any;
  return win.process?.env?.[key] || (import.meta as any).env?.[key] || "";
};

const DB_URL = getEnv('VITE_DATABASE_URL') || 'https://urokqoorxuiokizesiwa.supabase.co';
const DB_KEY = getEnv('VITE_SUPABASE_ANON') || 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8';

export const supabase = createClient(DB_URL, DB_KEY);

export const PLANS = [
  { id: '1B', label: 'Starter Tier', price: 100000, credits: 1000, durationDays: 30 },
  { id: '3B', label: 'Pro Tier', price: 250000, credits: 3500, durationDays: 90 },
  { id: '1T', label: 'Master Tier', price: 900000, credits: 15000, durationDays: 365 }
];

export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    const settings: Record<string, any> = { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
    data?.forEach(item => { settings[item.key] = item.value; });
    return settings;
  } catch (e) {
    return { cost_image: 25, cost_video: 150, cost_voice: 150, cost_studio: 600 };
  }
};

export const updateSystemSetting = async (key: string, value: any) => {
  return await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
};

export const sendTelegramNotification = async (message: string) => {
  const botToken = getEnv('VITE_TELEGRAM_BOT_TOKEN');
  const chatId = getEnv('VITE_TELEGRAM_CHAT_ID');
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🚀 *SATMOKO HUB*\n\n${message}`, parse_mode: 'Markdown' })
    });
  } catch (e) {}
};

export const getUserCredits = async (email: string): Promise<number> => {
  if (isAdmin(email)) return 999999;
  const { data } = await supabase.from('members').select('credits').eq('email', email.toLowerCase()).maybeSingle();
  return data?.credits || 0;
};

export const deductCredits = async (email: string, amount: number): Promise<boolean> => {
  // ADMIN BYPASS: Always return true and don't deduct anything
  if (isAdmin(email)) return true;
  
  const current = await getUserCredits(email);
  if (current < amount) return false;
  const { error } = await supabase.from('members').update({ credits: current - amount }).eq('email', email.toLowerCase());
  return !error;
};

export const requestTopup = async (email: string, amount: number, price: number, receipt_url: string) => {
  const tid = `TOP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const { error } = await supabase.from('topup_requests').insert([{
    tid,
    email: email.toLowerCase(),
    amount,
    price,
    receipt_url,
    status: 'pending'
  }]);
  
  if (!error) {
    sendTelegramNotification(`💳 *PERMINTAAN TOPUP*\nEmail: ${email}\nJumlah: ${amount} CR\nTID: ${tid}`);
  }
  return { success: !error, tid };
};

export const approveTopup = async (requestId: number, email: string, amount: number) => {
  const { error: reqError } = await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', requestId);
  if (reqError) return false;
  
  const current = await getUserCredits(email);
  const { error: memError } = await supabase.from('members').update({ 
    credits: current + amount,
    status: 'active' 
  }).eq('email', email.toLowerCase());
  
  if (!memError) {
    sendTelegramNotification(`💰 *TOPUP DISETUJUI*\nEmail: ${email}\nJumlah: ${amount} CR`);
    return true;
  }
  return false;
};

export const manualUpdateCredits = async (email: string, amount: number) => {
  const { error } = await supabase.from('members').update({ credits: amount }).eq('email', email.toLowerCase());
  if (!error) {
     sendTelegramNotification(`🛠 *UPDATE SALDO MANUAL*\nEmail: ${email}\nSaldo Baru: ${amount} CR`);
  }
  return !error;
};

export const updatePresence = async (email: string) => {
  if (!email) return;
  await supabase.from('members').upsert({ email: email.toLowerCase(), last_seen: new Date().toISOString() }, { onConflict: 'email' });
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  return (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 < 150; 
};

export const isAdmin = (email: string) => {
  const admins = (getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com,rlirp3fop@mozmail.com').toLowerCase().split(',');
  return admins.includes(email.toLowerCase());
};

export const getAdminPassword = () => getEnv('VITE_PASSW') || 'satmoko123';

let currentSlot = 1;
export const rotateApiKey = () => {
  currentSlot = currentSlot >= 3 ? 1 : currentSlot + 1;
  const nextKey = getEnv(`VITE_GEMINI_API_${currentSlot}`);
  const win = window as any;
  if (nextKey) {
    if (!win.process) win.process = { env: {} };
    if (!win.process.env) win.process.env = {};
    win.process.env.API_KEY = nextKey;
  }
  return nextKey || getEnv('VITE_GEMINI_API_1');
};

export const getActiveApiKey = () => {
  const win = window as any;
  return win.process?.env?.API_KEY || getEnv('VITE_GEMINI_API_1');
};

export const auditApiKeys = () => {
  return {
    slot1: !!getEnv('VITE_GEMINI_API_1'),
    slot2: !!getEnv('VITE_GEMINI_API_2'),
    slot3: !!getEnv('VITE_GEMINI_API_3'),
    currentActive: getActiveApiKey() ? 'TERPASANG' : 'KOSONG',
    activeSlot: currentSlot
  };
};
