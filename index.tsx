
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// TypeScript Global Augmentation
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    snap: any;
    aistudio?: AIStudio;
    process: {
      env: Record<string, string>;
    };
  }

  interface ImportMeta {
    readonly env: any;
  }
}

// Sinkronisasi data lingkungan tambahan jika tersedia di import.meta
try {
  const metaEnv = (import.meta as any).env || {};
  Object.assign(window.process.env, metaEnv);
} catch (e) {}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
