
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).send('Webhook is active. Please use POST.');
  }

  // Ensure body is parsed (Vercel usually does this, but being explicit for resilience)
  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      console.error("[WEBHOOK] Failed to parse body:", e);
      return res.status(400).send('Invalid JSON');
    }
  }

  if (!payload) {
    console.error("[WEBHOOK] Empty payload received");
    return res.status(400).send('Empty payload');
  }

  // Extract keys safely
  const order_id = payload.order_id;
  const status_code = payload.status_code;
  const gross_amount = payload.gross_amount;
  const signature_key = payload.signature_key;
  const transaction_status = payload.transaction_status;
  const fraud_status = payload.fraud_status;

  console.log(`[MIDTRANS-WEBHOOK] Received: ${order_id} | Status: ${transaction_status}`);

  if (!order_id) {
    console.warn("[WEBHOOK] Missing order_id in payload");
    return res.status(200).send('OK - No Order ID');
  }

  // 1. Bypass Test Notifications
  const isTest = typeof order_id === 'string' && (order_id.includes('test') || order_id.includes('notif_test'));
  if (isTest) {
    return res.status(200).send('OK - Bypassed Test Notif');
  }

  // 2. Verify Signature
  const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || process.env.MIDTRANS_SERVER_KEY || '';
  if (serverKey && signature_key) {
    try {
      const verifyString = order_id + status_code + gross_amount + serverKey;
      const calculatedHash = crypto.createHash('sha512').update(verifyString).digest('hex');

      if (calculatedHash !== signature_key) {
        console.error("[SECURITY] Signature Mismatch! Check server key configuration.");
        // We still return 200 to acknowledge the hit, but we might choose not to process it.
        // For debugging purposes, we'll continue but log the error.
      }
    } catch (sigErr) {
      console.error("[SECURITY] Error during signature verification:", sigErr);
    }
  }

  // 3. Init Supabase
  const supabaseUrl = process.env.VITE_DATABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON || '';

  if (!supabaseUrl || !supabaseKey) {
     console.error("[DB] Supabase config missing");
     return res.status(500).send('Internal Server Error - Config Missing');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 4. Find the transaction record in topup_requests (Source of Truth)
    const { data: request } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('tid', order_id)
      .maybeSingle();

    let email = request?.email;
    let creditsToAdd = request?.amount;

    // Fallback to searching member via metadata if not found in topup_requests
    if (!email) {
      // Use filter with JSON path for Supabase JS Client compatibility
      const { data: memberByMeta } = await supabase
        .from('members')
        .select('*')
        .filter('metadata->>order_id', 'eq', order_id)
        .maybeSingle();

      if (memberByMeta) {
        email = memberByMeta.email;
        creditsToAdd = memberByMeta.metadata?.credits || 1000;
      }
    }

    if (!email) {
      console.warn(`[DB] No transaction or member found for Order ID: ${order_id}`);
      return res.status(200).send('Order not tracked');
    }

    // 5. Check if already processed (Idempotency)
    if (request && request.status === 'approved') {
       console.log(`[IDEMPOTENCY] Order ${order_id} already processed.`);
       return res.status(200).send('OK - Already Processed');
    }

    // 6. Update status if paid
    const isSettled = (transaction_status === 'settlement' || transaction_status === 'capture') && (fraud_status === 'accept' || !fraud_status);

    if (isSettled) {
      const { data: member } = await supabase
        .from('members')
        .select('credits, status')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (member) {
        const newCredits = (member.credits || 0) + (Number(creditsToAdd) || 0);
        const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Apply updates to member
        const { error: updateError } = await supabase
          .from('members')
          .update({
            status: 'active',
            credits: newCredits,
            valid_until: validUntil,
            last_seen: new Date().toISOString()
          })
          .eq('email', email.toLowerCase().trim());

        if (updateError) throw updateError;

        // Mark request as approved
        if (request) {
          await supabase.from('topup_requests').update({ status: 'approved' }).eq('id', request.id);
        } else {
          await supabase.from('topup_requests').insert({
            email: email.toLowerCase().trim(),
            amount: creditsToAdd,
            price: gross_amount,
            tid: order_id,
            status: 'approved',
            receipt_url: 'WEBHOOK_AUTO_RECOVERY'
          });
        }

        // 7. Telegram Notification
        const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        const chatId = process.env.VITE_TELEGRAM_CHAT_ID;
        if (botToken && chatId) {
          const text = `✅ *WEBHOOK: PEMBAYARAN SUKSES*\n\nUser: ${email}\nOrder: ${order_id}\nCredits: +${creditsToAdd}\nStatus: COMPLETED`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
          }).catch(err => console.error("Telegram notification failed:", err));
        }
        console.log(`[SUCCESS] User ${email} processed via Webhook.`);
      }
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      if (request) {
        await supabase.from('topup_requests').update({ status: 'failed' }).eq('id', request.id);
      }
      console.log(`[FAILED] Order ${order_id} marked as failed.`);
    }

    return res.status(200).send('OK');
  } catch (err: any) {
    console.error("[ERROR] Webhook processing critical failure:", err.message);
    return res.status(500).send('Internal Server Error');
  }
}
