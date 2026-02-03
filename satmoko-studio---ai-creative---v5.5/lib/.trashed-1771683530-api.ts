
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION HUB ---
const getEnv = (key: string) => {
  const win = window as any;
  return win.process?.env?.[key] || (import.meta as any).env?.[key];
};

const DB_URL = getEnv('VITE_DATABASE_URL') || 'https://urokqoorxuiokizesiwa.supabase.co';
const DB_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_G1udRukMNJjDM6wlVD3xtw_IF8Yrbd8';

// --- BACKEND SERVICE ---
export const supabase = createClient(DB_URL, DB_KEY);

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
  // ADMIN BYPASS: Admin tidak memotong kredit
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

// --- PRESENCE SYSTEM (HEARTBEAT) ---
export const updatePresence = async (email: string) => {
  if (!email) return;
  const normalizedEmail = email.toLowerCase();
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('members')
      .upsert({ 
        email: normalizedEmail, 
        last_seen: now,
        status: 'active' 
      }, { onConflict: 'email' });
      
    if (error) console.warn("Presence Error:", error.message);
  } catch (e: any) {
    console.warn("Presence Heartbeat Failed:", e?.message);
  }
};

export const isUserOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  try {
    const lastSeenDate = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    const diffInSeconds = (now - lastSeenDate) / 1000;
    return diffInSeconds < 150; 
  } catch {
    return false;
  }
};

export const isAdmin = (email: string) => {
  const adminEmails = (getEnv('VITE_ADMIN_EMAILS') || 'pringgosatmoko@gmail.com').toLowerCase().split(',');
  return adminEmails.includes(email.toLowerCase());
};

export const getAdminPassword = () => getEnv('VITE_ADMIN_PASSWORD') || 'satmoko123';

export const getActiveApiKey = () => {
  const win = window as any;
  return win.process?.env?.API_KEY || getEnv('VITE_GEMINI_API_KEY_1');
};

export const getSlotStatus = (slotIndex: number) => {
  const activeKey = getActiveApiKey();
  if (slotIndex === 1) return !!activeKey && activeKey.length > 10;
  const key = getEnv(`VITE_GEMINI_API_KEY_${slotIndex}`);
  return !!key && key.length > 10;
};
