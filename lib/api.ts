import { createClient } from '@supabase/supabase-js';

/**
 * lib/api.ts
 * - Client-safe helpers and compatibility shims.
 * - Provide wrappers/stubs for functions used across the app so the client bundle builds.
 * - DO NOT put server-only secrets here. Implement server endpoints for operations that require secrets.
 */

// Client-safe env (Vite)
const supabaseUrl = (import.meta.env.VITE_DATABASE_URL as string) || '';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON as string) || '';

// Supabase client (anon key; safe for public client usage)
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Configurable admin emails (used only for UI decisions)
const adminEmailsRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || 'pringgosatmoko@gmail.com';
export const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase());

export const isAdmin = (email?: string) => {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
};

// -----------------------------
// Compatibility stubs / wrappers
// -----------------------------

// Deprecated on-client getter: return null and warn. Components should not rely on client-stored admin password.
export const getAdminPassword = (): string | null => {
  console.warn('[lib/api] getAdminPassword() is deprecated and returns null for safety.');
  return null;
};

// Helper to call API endpoints (relative or absolute if VITE_API_BASE_URL set)
const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const url = apiBase ? `${apiBase}${path}` : path;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
};

// createMidtransToken -> ask server to create snap token (server holds Midtrans key)
export async function createMidtransToken(payload: { email?: string; credits?: number; amount?: number; orderId?: string }) {
  return apiFetch('/api/midtrans/create-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// processMidtransTopup -> ask server to validate and finalize topup
export async function processMidtransTopup(payload: { transactionId: string; orderId?: string; status?: string }) {
  return apiFetch('/api/midtrans/process-topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// logActivity: fire-and-forget client logging to server; fallback to console
export function logActivity(event: { type: string; message?: string; meta?: any } | string) {
  const body = typeof event === 'string' ? { type: 'info', message: event } : event;
  // Fire-and-forget
  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {
    console.debug('[logActivity fallback]', body);
  });
}

// isUserOnline -> ask server or use supabase presence if implemented. Default: false
export async function isUserOnline(email: string) {
  try {
    const res = await apiFetch(`/api/users/online?email=${encodeURIComponent(email)}`);
    return !!res?.online;
  } catch (e) {
    return false;
  }
}

// sendTelegramNotification -> ask server to send telegram message (server holds bot token)
export async function sendTelegramNotification(payload: { chatId?: string; message: string }) {
  return apiFetch('/api/telegram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// deductCredits -> ask server to deduct credits from user; server must perform secure DB updates
export async function deductCredits(email: string, amount: number) {
  try {
    const res = await apiFetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount }),
    });
    return !!res?.success;
  } catch (e) {
    return false;
  }
}

// getSystemSettings -> fetch system settings (costs, defaults)
export async function getSystemSettings() {
  try {
    const res = await apiFetch('/api/system/settings');
    return res || {};
  } catch (e) {
    // sensible defaults
    return { cost_image: 25, cost_video: 150 };
  }
}

// Topup admin helpers
export async function getPendingTopups() {
  try {
    const res = await apiFetch('/api/topups/pending');
    return res?.data || [];
  } catch (e) {
    return [];
  }
}

export async function approveTopup(id: number) {
  try {
    const res = await apiFetch('/api/topups/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return !!res?.success;
  } catch (e) {
    return false;
  }
}

// Example placeholder used elsewhere
export const rotateApiKey = () => {
  console.warn('[lib/api] rotateApiKey() placeholder. Implement rotation on server-side.');
};

export const auditApiKeys = () => {
  // Return a shape used by SystemLogs; fill with best-effort checks
  return {
    db: !!supabase,
    ai: false, // client can't check AI service availability reliably
    telegram: false,
    adminEmails: adminEmails.length,
  };
};

export default {};