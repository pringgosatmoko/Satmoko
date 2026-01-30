
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).send('Webhook is active. Please use POST.');
  }

  const payload = req.body;
  const { 
    order_id, 
    status_code, 
    gross_amount, 
    signature_key, 
    transaction_status, 
    fraud_status 
  } = payload;

  console.log(`[MIDTRANS-NOTIF] Received: ${order_id} | Status: ${transaction_status}`);

  // 1. Bypass untuk tombol "Test" di Dashboard Midtrans
  if (!order_id || order_id.includes('test') || order_id.includes('notif_test')) {
    return res.status(200).send('OK - Bypassed Test Notif');
  }

  // 2. Verifikasi Signature (Gunakan SERVER_ID dari environment variable Vercel)
  const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || '';
  
  // Midtrans gross_amount bisa berupa string "100.00", kita harus gunakan string aslinya dari payload
  const verifyString = order_id + status_code + gross_amount + serverKey;
  const calculatedHash = crypto.createHash('sha512').update(verifyString).digest('hex');

  if (calculatedHash !== signature_key) {
    console.error("[SECURITY] Signature Mismatch!");
    console.debug(`Expected: ${signature_key}`);
    console.debug(`Calculated: ${calculatedHash}`);
    // Tetap kirim 200 OK agar Midtrans tidak terus menerus retry, tapi jangan proses database
    return res.status(200).send('Invalid Signature');
  }

  // 3. Init Supabase
  const supabaseUrl = process.env.VITE_DATABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Cari member yang memiliki order_id ini di metadata
    const { data: member, error: findError } = await supabase
      .from('members')
      .select('*')
      .filter('metadata->>order_id', 'eq', order_id)
      .maybeSingle();

    if (!member || findError) {
      console.warn(`[DB] No member found for Order ID: ${order_id}`);
      return res.status(200).send('Order not tracked');
    }

    // 4. Update status jika lunas
    const isSettled = (transaction_status === 'settlement' || transaction_status === 'capture') && (fraud_status === 'accept' || !fraud_status);

    if (isSettled && member.status !== 'active') {
      const creditsToAdd = member.metadata?.credits || 1000;
      const currentCredits = member.credits || 0;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('members')
        .update({
          status: 'active',
          credits: currentCredits + creditsToAdd,
          valid_until: validUntil,
          last_seen: new Date().toISOString()
        })
        .eq('email', member.email);

      if (updateError) throw updateError;

      // 5. Telegram Notification
      const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
      const chatId = process.env.VITE_TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const text = `✅ *WEBHOOK: PEMBAYARAN SUKSES*\n\nUser: ${member.email}\nOrder: ${order_id}\nCredits: +${creditsToAdd}\nStatus: ACTIVE`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
      }
      console.log(`[SUCCESS] Member ${member.email} activated via Webhook.`);
    }

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error("[ERROR] Webhook processing failed:", err.message);
    return res.status(200).send('Internal Server Error');
  }
}
