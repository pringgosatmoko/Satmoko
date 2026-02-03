
// Robust Environment Variable Polyfill for Satmoko Studio V10.0
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  const metaEnv = (import.meta as any).env || {};
  
  const syncVar = (key: string) => {
    const val = metaEnv[key] || win.process.env[key] || "";
    win.process.env[key] = val;
    return val;
  };

  // Database & Auth
  syncVar('VITE_DATABASE_URL');
  syncVar('VITE_SUPABASE_ANON');
  syncVar('VITE_ADMIN_EMAILS');
  syncVar('VITE_PASSW');
  
  // Midtrans Client Key
  const clientKey = syncVar('VITE_MIDTRANS_CLIENT_KEY') || syncVar('VITE_MIDTRANS_CLIENT_ID') || 'SB-Mid-client-PLACEHOLDER';
  
  // DYNAMIC SCRIPT INJECTION (FIX: Agar otomatis ganti Sandbox/Production)
  const isSandbox = clientKey.toUpperCase().startsWith('SB-');
  const snapUrl = isSandbox 
    ? 'https://app.sandbox.midtrans.com/snap/snap.js' 
    : 'https://app.midtrans.com/snap/snap.js';

  const midtransScript = document.getElementById('midtrans-script') as HTMLScriptElement;
  if (midtransScript) {
    midtransScript.setAttribute('data-client-key', clientKey);
    midtransScript.src = snapUrl; // Otomatis mengarahkan ke SDK yang benar
  }

  // Telegram Integration
  syncVar('VITE_TELEGRAM_CHAT_ID');
  syncVar('VITE_TELEGRAM_BOT_TOKEN');

  // Multi-Slot Gemini Keys
  const k1 = syncVar('VITE_GEMINI_API_1');
  syncVar('VITE_GEMINI_API_2');
  syncVar('VITE_GEMINI_API_3');

  if (k1) {
    win.process.env.API_KEY = k1;
  } else {
    win.process.env.API_KEY = win.process.env.API_KEY || "";
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
