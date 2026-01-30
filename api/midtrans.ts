
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, credits, price, orderId } = await req.json();

    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || '';
    if (!serverKey) {
      return new Response(JSON.stringify({ error: 'Server Key missing in environment' }), { status: 500 });
    }

    // Initialize Supabase to record the transaction attempt
    const supabaseUrl = process.env.VITE_DATABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Record the pending transaction
    await supabase.from('topup_requests').insert({
      email: email.toLowerCase(),
      amount: credits,
      price: price,
      tid: orderId,
      status: 'pending',
      receipt_url: 'MIDTRANS_AUTO_FLOW'
    });

    const authHeader = `Basic ${btoa(serverKey + ':')}`;

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
          email: email,
          first_name: email.split('@')[0]
        },
        item_details: [{
          id: 'AI_CREDITS',
          price: price,
          quantity: 1,
          name: `${credits} AI Credits`
        }]
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
