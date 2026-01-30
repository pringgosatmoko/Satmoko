
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, credits, price, orderId } = await req.json();

    // Ambil Key dari server, JANGAN kirim dari client!
    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || '';
    if (!serverKey) {
      return new Response(JSON.stringify({ error: 'Server Key missing in environment' }), { status: 500 });
    }

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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
