
// SATMOKO WEBHOOK HANDLER V8.0 - OPTIMIZED
// Pastikan Master memasukkan SUPABASE_SERVICE_ROLE_KEY & VITE_MIDTRANS_SERVER_KEY di Vercel

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status
  } = req.body;

  // 1. Verifikasi Signature Key Keamanan
  const serverKey = process.env.VITE_MIDTRANS_SERVER_KEY || "";
  const hash = crypto.createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex');

  if (hash !== signature_key) {
    return res.status(401).json({ message: 'Invalid Signature' });
  }

  // 2. Inisialisasi Supabase dengan Service Role (Bypass RLS)
  const supabase = createClient(
    process.env.VITE_DATABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // 3. Logika Aktivasi Otomatis
  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    if (fraud_status === 'challenge') return res.status(200).send('OK');

    // Query spesifik ke metadata JSON untuk mencari order_id
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .filter('metadata->>order_id', 'eq', order_id);

    const member = members?.[0];

    if (member) {
      const { credits_to_add, days_to_add } = member.metadata || { credits_to_add: 1000, days_to_add: 30 };
      
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (days_to_add || 30));

      const { error: updateError } = await supabase
        .from('members')
        .update({
          status: 'active',
          credits: Number(member.credits || 0) + Number(credits_to_add),
          valid_until: newExpiry.toISOString(),
          metadata: { ...member.metadata, payment_status: 'PAID', paid_at: new Date().toISOString() }
        })
        .eq('email', member.email);

      if (!updateError) {
        // Notifikasi Telegram
        const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        const chatId = process.env.VITE_TELEGRAM_CHAT_ID;
        const msg = `✅ *AKTIVASI OTOMATIS BERHASIL*\nUser: ${member.email}\nOrder: ${order_id}\nPaket: +${credits_to_add} CR\nMasa Aktif: +${days_to_add} Hari`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `🚀 *SATMOKO HUB*\n\n${msg}`, parse_mode: 'Markdown' })
        });
      }
    }
  }

  return res.status(200).send('OK');
}
