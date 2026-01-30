
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    const { email, credits, price, orderId } = body;

    if (!email || !credits || !price || !orderId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
    }

    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || process.env.MIDTRANS_SERVER_KEY || '';
    if (!serverKey) {
      return new Response(JSON.stringify({ error: 'Midtrans Server Key missing' }), { status: 500 });
    }

    // Initialize Supabase to record the transaction attempt
    const supabaseUrl = process.env.VITE_DATABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON || '';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Record the pending transaction
      await supabase.from('topup_requests').insert({
        email: email.toLowerCase().trim(),
        amount: credits,
        price: price,
        tid: orderId,
        status: 'pending',
        receipt_url: 'MIDTRANS_AUTO_FLOW'
      }).catch(err => console.error("DB Log Error:", err));
    }

    const authHeader = `Basic ${btoa(serverKey + ':')}`;

    const origin = req.headers.get('origin') || 'https://satmoko-n3rl.vercel.app';
    const midtransResponse = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: price
        },
        customer_details: {
          email: email.trim(),
          first_name: email.split('@')[0]
        },
        item_details: [{
          id: 'AI_CREDITS',
          price: price,
          quantity: 1,
          name: `${credits} AI Credits`
        }],
        callbacks: {
          finish: origin
        }
      })
    });

    const data = await midtransResponse.json();
    return new Response(JSON.stringify(data), {
      status: midtransResponse.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("[MIDTRANS-API] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
