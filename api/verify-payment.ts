
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

    const { orderId } = body;
    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || process.env.MIDTRANS_SERVER_KEY || '';

    if (!orderId || !serverKey) {
      return new Response(JSON.stringify({ error: 'Missing parameters (orderId or serverKey)' }), { status: 400 });
    }

    const authHeader = `Basic ${btoa(serverKey + ':')}`;

    const response = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const data = await response.json();
    const isPaid = data.transaction_status === 'settlement' || data.transaction_status === 'capture';

    return new Response(JSON.stringify({ 
      isPaid, 
      status: data.transaction_status,
      raw: data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("[VERIFY-PAYMENT] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
