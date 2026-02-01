import { createClient } from '@supabase/supabase-js';

/**
 * lib/api.ts
 * - Move secret/configuration to environment variables (Vite import.meta.env)
 * - Avoid hardcoded passwords or secrets in the client bundle
 * - Use VITE_ prefixed vars for client-safe values
 */

// Client-safe env (Vite)
const supabaseUrl = (import.meta.env.VITE_DATABASE_URL as string) || '';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON as string) || '';

// Initialize Supabase client (anon key) that is safe for front-end public usage
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Configurable list of admin emails (comma-separated). This is used for client UI decisions only.
const adminEmailsRaw = (import.meta.env.VITE_ADMIN_EMAILS as string) || 'pringgosatmoko@gmail.com';
export const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase());

export const isAdmin = (email?: string) => {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
};

// NOTE: Do NOT store server-only secrets in client code. Any operation that requires sensitive keys
// (Midtrans server key, Supabase service_role, etc.) must be implemented on a secure server-side endpoint.
export const rotateApiKey = () => {
  // Placeholder: implement rotation in backend and expose a secure endpoint if necessary.
  console.warn('[lib/api] rotateApiKey() is a placeholder. Manage secrets on server-side.');
};

export const auditApiKeys = () => {
  return {
    db: !!supabase,
    adminEmails: adminEmails.length,
  };
};
