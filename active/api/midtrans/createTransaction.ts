import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { orderId, amount, email, fullName } = req.body;
    const serverKey = process.env.VITE_MIDTRANS_SERVER_ID || "";
    
    if (!serverKey) throw new Error("Server key missing");

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
    const isSandbox = serverKey.startsWith('SB-');
    const baseUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
      : 'https://app.midtrans.com/snap/v1/transactions';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: { first_name: fullName, email: email },
        usage_limit: 1
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}