
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { orderId } = await req.json();
    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || '';

    if (!orderId || !serverKey) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
