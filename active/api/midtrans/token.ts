
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { orderId, amount, email, fullName } = req.body;
    
    // Server-side (Vercel) menggunakan process.env
    const serverId = process.env.VITE_MIDTRANS_SERVER_ID;
    
    if (!serverId) {
      return res.status(500).json({ 
        error: "KONFIGURASI_ERROR: VITE_MIDTRANS_SERVER_ID tidak ditemukan di Env Vercel." 
      });
    }

    const authString = Buffer.from(`${serverId}:`).toString('base64');
    const isSandbox = serverId.toUpperCase().startsWith('SB-');
    const baseUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: { first_name: fullName, email: email },
        usage_limit: 1,
        enabled_payments: ["credit_card", "gopay", "shopeepay", "other_va"]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: response.status === 401 ? "MIDTRANS_AUTH_FAILED: Periksa Server ID." : data.error_messages?.[0]
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "SISTEM_FAILURE: " + error.message });
  }
}
