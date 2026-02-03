
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

// --- TELEGRAM NOTIFICATION ENGINE ---
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
        text: `🛡️ *SATMOKO HUB ALERTS*\n\n${message}`,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.error("Telegram Transmission Failed:", e);
  }
};

// --- AUTH & SECURITY ---
export const isAdmin = (email: string) => {
  const adminEmails = (getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com').toLowerCase().split(',');
  return adminEmails.includes(email.toLowerCase());
};

export const getAdminPassword = () => getEnv('VITE_PASSW') || 'satmoko123';

// --- DATABASE KEY MANAGEMENT (SECURITY UPDATE) ---
/**
 * Mengambil Kunci AI dari Database.
 * Hanya dipanggil saat inisialisasi aplikasi untuk meminimalkan paparan.
 */
export const fetchMasterKeyFromDb = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'GEMINI_MASTER_KEY')
      .single();
    
    if (error) return null;
    return data.config_value;
  } catch {
    return null;
  }
};

export const saveMasterKeyToDb = async (newKey: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        config_key: 'GEMINI_MASTER_KEY', 
        config_value: newKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_key' });
    
    return !error;
  } catch {
    return false;
  }
};

export const getActiveApiKey = () => {
  const win = window as any;
  return win.process?.env?.API_KEY || "";
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
  } catch (e) {}
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  const diff = (new Date().getTime() - new Date(lastSeen).getTime()) / 1000;
  return diff < 150; 
};
