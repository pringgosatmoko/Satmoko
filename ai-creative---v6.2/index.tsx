
// SATMOKO HUB V5.8 - NEURAL CORE BOOTSTRAPPER
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  
  const env = (import.meta as any).env || {};
  
  // LOGIKA BYPASS: Cek apakah ada kunci darurat di LocalStorage
  const bypassKey = localStorage.getItem('SATMOKO_KEY_BYPASS');
  
  // Ambil kunci dari environment Vercel sebagai cadangan
  const venvKey = env.VITE_GEMINI_API_1 || env.VITE_GEMINI_API || env.API_KEY || "";
  
  // Suntikkan ke process.env agar terbaca oleh SDK Google GenAI
  const finalKey = bypassKey || venvKey;
  win.process.env.API_KEY = finalKey;
  
  // Mapping variabel lainnya
  Object.keys(env).forEach(key => {
    win.process.env[key] = env[key];
  });

  if (bypassKey) {
    console.log("SATMOKO_HUB: Emergency Bypass Key Active.");
  } else if (venvKey) {
    console.log("SATMOKO_HUB: Neural Link Slot 1 Authorized.");
  } else {
    console.warn("SATMOKO_HUB: No API Key found. Use Security Menu to set bypass.");
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
