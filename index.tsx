
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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

// Global Process Polyfill for browser environment safety
if (typeof window !== 'undefined') {
  window.process = window.process || { env: {} };
  // Ensure API_KEY is accessible if injected
  if (!window.process.env) window.process.env = {};
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
