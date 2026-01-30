
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

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

  console.log(`[MIDTRANS-WEBHOOK] Received: \${order_id} | Status: \${transaction_status}`);

  // 1. Bypass Test Notifications
  if (!order_id || order_id.includes('test') || order_id.includes('notif_test')) {
    return res.status(200).send('OK - Bypassed Test Notif');
  }

  // 2. Verify Signature
  const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || '';
  const verifyString = order_id + status_code + gross_amount + serverKey;
  const calculatedHash = crypto.createHash('sha512').update(verifyString).digest('hex');

  if (calculatedHash !== signature_key) {
    console.error("[SECURITY] Signature Mismatch!");
    return res.status(200).send('Invalid Signature');
  }

  // 3. Init Supabase
  const supabaseUrl = process.env.VITE_DATABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 4. Find the transaction record in topup_requests (Source of Truth)
    const { data: request, error: reqError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('tid', order_id)
      .maybeSingle();

    let email = request?.email;
    let creditsToAdd = request?.amount;

    // Fallback to searching member via metadata if not found in topup_requests
    if (!email) {
      const { data: memberByMeta } = await supabase
        .from('members')
        .select('*')
        .eq('metadata->order_id', order_id)
        .maybeSingle();

      if (memberByMeta) {
        email = memberByMeta.email;
        creditsToAdd = memberByMeta.metadata?.credits || 1000;
      }
    }

    if (!email) {
      console.warn(`[DB] No transaction or member found for Order ID: \${order_id}`);
      return res.status(200).send('Order not tracked');
    }

    // 5. Check if already processed to prevent double crediting
    if (request && request.status === 'approved') {
       console.log(`[IDEMPOTENCY] Order \${order_id} already processed.`);
       return res.status(200).send('OK - Already Processed');
    }

    // 6. Update status if paid
    const isSettled = (transaction_status === 'settlement' || transaction_status === 'capture') && (fraud_status === 'accept' || !fraud_status);

    if (isSettled) {
      // Get current member data
      const { data: member } = await supabase
        .from('members')
        .select('credits, status')
        .eq('email', email.toLowerCase())
        .single();

      if (member) {
        const newCredits = (member.credits || 0) + (creditsToAdd || 0);
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Update member
        const { error: updateError } = await supabase
          .from('members')
          .update({
            status: 'active',
            credits: newCredits,
            valid_until: validUntil,
            last_seen: new Date().toISOString()
          })
          .eq('email', email.toLowerCase());

        if (updateError) throw updateError;

        // Mark request as approved in topup_requests
        if (request) {
          await supabase
            .from('topup_requests')
            .update({ status: 'approved' })
            .eq('id', request.id);
        } else {
          // If it was a legacy meta search, create a record to prevent double processing
          await supabase.from('topup_requests').insert({
            email: email.toLowerCase(),
            amount: creditsToAdd,
            price: gross_amount,
            tid: order_id,
            status: 'approved',
            receipt_url: 'WEBHOOK_LEGACY_FLOW'
          });
        }

        // 7. Telegram Notification
        const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        const chatId = process.env.VITE_TELEGRAM_CHAT_ID;
        if (botToken && chatId) {
          const text = `✅ *WEBHOOK: PEMBAYARAN SUKSES*\n\nUser: \${email}\nOrder: \${order_id}\nCredits: +\${creditsToAdd}\nStatus: COMPLETED`;
          await fetch(`https://api.telegram.org/bot\${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
          });
        }
        console.log(`[SUCCESS] User \${email} processed via Webhook.`);
      }
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      if (request) {
        await supabase.from('topup_requests').update({ status: 'failed' }).eq('id', request.id);
      }
      console.log(`[FAILED] Order \${order_id} marked as failed.`);
    }

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error("[ERROR] Webhook processing failed:", err.message);
    return res.status(500).send('Internal Server Error');
  }
}
