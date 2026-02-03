
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { orderId, amount, email, fullName } = req.body;
    
    // Prioritaskan VITE_MIDTRANS_SERVER_ID sesuai screenshot Vercel Master
    const rawServerId = process.env.VITE_MIDTRANS_SERVER_ID || process.env.MIDTRANS_SERVER_ID;
    const serverId = rawServerId?.trim();
    
    if (!serverId) {
      return res.status(500).json({ error: "MIDTRANS_SERVER_ID_MISSING" });
    }

    // Auth Header: Basic [base64(server_id:)]
    const authHeader = `Basic ${Buffer.from(`${serverId}:`).toString('base64')}`;
    
    // Tentukan URL berdasarkan prefix key
    const isSandbox = serverId.toUpperCase().startsWith('SB-');
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
        transaction_details: { 
          order_id: orderId, 
          gross_amount: Math.round(amount) 
        },
        customer_details: { 
          first_name: fullName, 
          email: email 
        },
        credit_card: { secure: true },
        usage_limit: 1
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error_messages?.[0] || "PAYMENT_GATEWAY_AUTH_ERROR" 
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
