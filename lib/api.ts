import { createClient } from '@supabase/supabase-js';

/**
 * lib/api.ts
 * - Client-safe helpers and compatibility shims.
 * - NO server secrets here. Implement server endpoints for operations that need secrets.
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

/**
 * Backwards-compatible stubs / wrappers
 *
 * These keep the same API surface that components import, but:
 * - They do NOT contain secrets.
 * - They call server endpoints (you must implement) for sensitive ops.
 */

// Deprecated on-client getter: return null and warn. Components should not rely on client-stored admin password.
export const getAdminPassword = (): string | null => {
  console.warn('[lib/api] getAdminPassword() is deprecated and returns null for safety.');
  return null;
};

// createMidtransToken(payload) -> asks your server to create a Midtrans snap token.
// Server must hold Midtrans server key and implement the endpoint.
export async function createMidtransToken(payload: { amount: number; orderId?: string }) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const url = apiBase ? `${apiBase}/api/midtrans/create-token` : `/api/midtrans/create-token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`createMidtransToken failed: ${res.status} ${text}`);
  }
  return res.json();
}

// processMidtransTopup -> send topup data to server to validate & finalize (server uses secret keys)
export async function processMidtransTopup(payload: { transactionId: string; status?: string }) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const url = apiBase ? `${apiBase}/api/midtrans/process-topup` : `/api/midtrans/process-topup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`processMidtransTopup failed: ${res.status} ${text}`);
  }
  return res.json();
}

// logActivity: fire-and-forget client logging to server; fallback to console if server unavailable
export function logActivity(event: { type: string; message?: string; meta?: any }) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const url = apiBase ? `${apiBase}/api/logs` : `/api/logs`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {
    console.debug('[logActivity fallback]', event);
  });
}

// rotation & audit helpers (client-side placeholders)
export const rotateApiKey = () => {
  console.warn('[lib/api] rotateApiKey() placeholder. Implement rotation on server-side.');
};

export const auditApiKeys = () => {
  return {
    db: !!supabase,
    adminEmails: adminEmails.length,
  };
};