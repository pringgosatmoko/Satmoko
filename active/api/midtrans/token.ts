
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { orderId, amount, email, fullName } = req.body;
    
    // Ambil Server Key dari berbagai kemungkinan nama variabel yang Master input
    const rawKey = process.env.VITE_MIDTRANS_SERVER_ID || 
                   process.env.MIDTRANS_SERVER_ID || 
                   process.env.MIDTRANS_SERVER_KEY || 
                   process.env.VITE_MIDTRANS_SERVER_KEY;

    // LOGIKA PERBAIKAN: Bersihkan kunci dari spasi, newline, atau karakter tersembunyi
    const serverKey = rawKey?.replace(/[^a-zA-Z0-9\-_:]/g, '').trim();
    
    if (!serverKey) {
      return res.status(500).json({ error: "SERVER_KEY_NOT_FOUND_IN_ENV" });
    }

    // Deteksi Sandbox berdasarkan prefix standar Midtrans (SB-)
    const isSandbox = serverKey.toUpperCase().startsWith('SB-');
    const baseUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    // Auth Header: Base64(server_key + ":")
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
    
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
        usage_limit: 1
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Midtrans API Error:", data);
      return res.status(response.status).json({ 
        error: data.error_messages ? data.error_messages[0] : "MIDTRANS_AUTH_REJECTED" 
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
