
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (typeof window !== 'undefined') {
  const win = window as any;
  const metaEnv = (import.meta as any).env || {};
  
  win.process = win.process || { env: {} };
  Object.assign(win.process.env, {
    API_KEY: metaEnv.VITE_GEMINI_API_1 || "",
    VITE_DATABASE_URL: metaEnv.VITE_DATABASE_URL,
    VITE_SUPABASE_ANON: metaEnv.VITE_SUPABASE_ANON,
    VITE_SUPABASE_ANON_KEY: metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_ANON,
    VITE_ADMIN_EMAILS: metaEnv.VITE_ADMIN_EMAILS,
  });

  // Ambil Client Key dan bersihkan dari karakter aneh
  const rawClientKey = metaEnv.VITE_MIDTRANS_CLIENT_ID || '';
  const clientKey = rawClientKey.replace(/[^a-zA-Z0-9\-_:]/g, '').trim();

  if (clientKey) {
    const isSandbox = clientKey.toUpperCase().startsWith('SB-');
    const snapUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/snap.js' 
      : 'https://app.midtrans.com/snap/snap.js';

    // Pastikan tidak memuat script dua kali
    if (!document.querySelector(`script[src="${snapUrl}"]`)) {
      const script = document.createElement('script');
      script.src = snapUrl;
      script.setAttribute('data-client-key', clientKey);
      script.async = true;
      document.head.appendChild(script);
    }
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
