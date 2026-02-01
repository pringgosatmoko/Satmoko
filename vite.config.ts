
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Define individual properties to avoid injecting object literals into property accessors
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_DATABASE_URL': JSON.stringify(env.VITE_DATABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON': JSON.stringify(env.VITE_SUPABASE_ANON || ''),
      'process.env.VITE_TELEGRAM_BOT_TOKEN': JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN || ''),
      'process.env.VITE_TELEGRAM_CHAT_ID': JSON.stringify(env.VITE_TELEGRAM_CHAT_ID || ''),
      'process.env.VITE_MIDTRANS_SERVER_ID': JSON.stringify(env.VITE_MIDTRANS_SERVER_ID || ''),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      port: 3000,
      host: true 
    }
  };
});
