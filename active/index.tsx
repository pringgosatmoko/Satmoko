
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure polyfill from index.html is augmented with current environment variables
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

  // Handle Midtrans Script Dynamically to avoid Unauthorized error
  const clientKey = metaEnv.VITE_MIDTRANS_CLIENT_ID || 'SB-Mid-client-PLACEHOLDER';
  const isSandbox = clientKey.toUpperCase().startsWith('SB-');
  const snapUrl = isSandbox 
    ? 'https://app.sandbox.midtrans.com/snap/snap.js' 
    : 'https://app.midtrans.com/snap/snap.js';

  // Find existing or create new script
  let midtransScript = document.getElementById('midtrans-script') as HTMLScriptElement;
  if (midtransScript) {
    midtransScript.setAttribute('data-client-key', clientKey);
    midtransScript.src = snapUrl;
  } else {
    const script = document.createElement('script');
    script.id = 'midtrans-script';
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    document.head.appendChild(script);
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
