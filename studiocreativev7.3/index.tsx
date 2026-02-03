
// Robust Environment Variable Polyfill for Satmoko Studio V3.1
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  const metaEnv = (import.meta as any).env || {};
  
  const syncVar = (key: string) => {
    win.process.env[key] = metaEnv[key] || win.process.env[key] || "";
  };

  // Database & Auth
  syncVar('VITE_DATABASE_URL');
  syncVar('VITE_SUPABASE_ANON');
  syncVar('VITE_ADMIN_EMAILS');
  syncVar('VITE_PASSW');
  syncVar('VITE_ADMIN_PHONES');

  // Telegram Integration
  syncVar('VITE_TELEGRAM_CHAT_ID');
  syncVar('VITE_TELEGRAM_BOT_TOKEN');

  // Multi-Slot Gemini Keys
  syncVar('VITE_GEMINI_API_1');
  syncVar('VITE_GEMINI_API_2');
  syncVar('VITE_GEMINI_API_3');

  // Set the primary API_KEY used by the SDK
  win.process.env.API_KEY = win.process.env.VITE_GEMINI_API_1 || win.process.env.API_KEY || "";
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
