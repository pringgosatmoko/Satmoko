
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION HUB ---
const getEnv = (key: string) => {
  const win = window as any;
  return win.process?.env?.[key] || (import.meta as any).env?.[key] || "";
};

const DB_URL = getEnv('VITE_DATABASE_URL') || 'https://urokqoorxuiokizesiwa.supabase.co';
const DB_KEY = getEnv('VITE_SUPABASE_ANON') || 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8';

// --- BACKEND SERVICE ---
export const supabase = createClient(DB_URL, DB_KEY);

// --- SYSTEM SETTINGS (PRICING) ---
export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    
    const settings: Record<string, any> = {
      cost_image: 20,
      cost_video: 150,
      cost_voice: 150,
      cost_studio: 600
    };

    data?.forEach(item => {
      settings[item.key] = item.value;
    });

    return settings;
  } catch (e) {
    return {
      cost_image: 20,
      cost_video: 150,
      cost_voice: 150,
      cost_studio: 600
    };
  }
};

export const updateSystemSetting = async (key: string, value: any): Promise<{success: boolean, error?: string}> => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown Connection Error" };
  }
};

// --- TELEGRAM INTEGRATION ---
export const sendTelegramNotification = async (message: string) => {
  const botToken = getEnv('VITE_TELEGRAM_BOT_TOKEN');
  const chatId = getEnv('VITE_TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚀 *SATMOKO HUB NOTIFICATION*\n\n${message}`,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.warn("Telegram Notify Failed:", e);
  }
};

// --- CREDIT SYSTEM ---
export const getUserCredits = async (email: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('credits')
      .eq('email', email.toLowerCase())
      .single();
    if (error) return 0;
    return data.credits || 0;
  } catch {
    return 0;
  }
};

export const deductCredits = async (email: string, amount: number): Promise<boolean> => {
  if (isAdmin(email)) return true;
  try {
    const current = await getUserCredits(email);
    if (current < amount) return false;
    const { error } = await supabase
      .from('members')
      .update({ credits: current - amount })
      .eq('email', email.toLowerCase());
    return !error;
  } catch {
    return false;
  }
};

export const topupCredits = async (email: string, amount: number): Promise<boolean> => {
  try {
    const current = await getUserCredits(email);
    const { error } = await supabase
      .from('members')
      .update({ credits: current + amount })
      .eq('email', email.toLowerCase());
    return !error;
  } catch {
    return false;
  }
};

// --- PRESENCE SYSTEM ---
export const updatePresence = async (email: string) => {
  if (!email) return;
  const normalizedEmail = email.toLowerCase();
  try {
    const now = new Date().toISOString();
    await supabase.from('members').upsert({ 
      email: normalizedEmail, 
      last_seen: now,
      status: 'active' 
    }, { onConflict: 'email' });
  } catch (e: any) {
    console.warn("Presence Heartbeat Failed:", e?.message);
  }
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  try {
    const lastSeenDate = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    return (now - lastSeenDate) / 1000 < 150; 
  } catch { return false; }
};

export const isAdmin = (email: string) => {
  const adminEmails = (getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com').toLowerCase().split(',');
  return adminEmails.includes(email.toLowerCase());
};

export const getAdminPassword = () => getEnv('VITE_PASSW') || 'satmoko123';

// --- ADVANCED KEY ROTATION SYSTEM ---
let currentSlot = 1;

export const rotateApiKey = () => {
  currentSlot = currentSlot >= 3 ? 1 : currentSlot + 1;
  const nextKey = getEnv(`VITE_GEMINI_API_${currentSlot}`);
  
  if (nextKey && typeof window !== 'undefined') {
    (window as any).process.env.API_KEY = nextKey;
  }
  
  console.log(`Rotating to API Slot: ${currentSlot}`);
  return nextKey || getEnv('VITE_GEMINI_API_1');
};

export const getActiveApiKey = () => {
  const win = window as any;
  return win.process?.env?.API_KEY || getEnv('VITE_GEMINI_API_1');
};

export const getSlotStatus = (slotIndex: number) => {
  const key = getEnv(`VITE_GEMINI_API_${slotIndex}`);
  return !!key && key.length > 10;
};
