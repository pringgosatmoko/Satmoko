
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Argumen ketiga '' digunakan agar Vite membaca SEMUA variabel di .env, bukan cuma yang VITE_
  // FIX: Casting process to any to bypass type conflicts and correctly access the Node.js cwd() method.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Teknik Bridging: Menyuntikkan variabel .env ke browser global
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY),
        VITE_DATABASE_URL: JSON.stringify(env.VITE_DATABASE_URL),
        VITE_SUPABASE_ANON: JSON.stringify(env.VITE_SUPABASE_ANON),
        VITE_TELEGRAM_BOT_TOKEN: JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN),
        VITE_TELEGRAM_CHAT_ID: JSON.stringify(env.VITE_TELEGRAM_CHAT_ID),
        VITE_MIDTRANS_SERVER_ID: JSON.stringify(env.VITE_MIDTRANS_SERVER_ID),
        NODE_ENV: JSON.stringify(mode),
      }
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
