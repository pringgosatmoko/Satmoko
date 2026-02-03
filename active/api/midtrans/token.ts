
import { Buffer } from 'buffer';

/**
 * BACKEND ONLY: Vercel Serverless Function
 * Menangani pembuatan Snap Token Midtrans secara aman di sisi server.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { orderId, amount, email, fullName } = req.body;
    
    // 1. Ambil Server Key dari environment variable backend (Vercel)
    // Gunakan trim() untuk membuang spasi/karakter tak terlihat yang sering merusak base64
    const rawServerId = process.env.VITE_MIDTRANS_SERVER_ID || process.env.MIDTRANS_SERVER_ID;
    const serverId = rawServerId?.trim();
    
    if (!serverId) {
      console.error("MIDTRANS_CONFIG_ERROR: Server ID tidak ditemukan di environment variable.");
      return res.status(500).json({ 
        error: "KONFIGURASI_SERVER_ERROR: Server ID belum dikonfigurasi di dashboard Vercel." 
      });
    }

    // 2. PEMBENTUKAN AUTH HEADER (PRESISI)
    // Format: Basic base64(SERVER_KEY + ":")
    // Tanda titik dua (:) di akhir key adalah WAJIB menurut spesifikasi Basic Auth Midtrans
    const authString = Buffer.from(`${serverId}:`).toString('base64');
    const authHeader = `Basic ${authString}`;

    // 3. Tentukan URL berdasarkan prefix key
    const isSandbox = serverId.toUpperCase().startsWith('SB-');
    const baseUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    console.log(`[Midtrans] Initiating ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} request for ${orderId}`);

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
        usage_limit: 1,
        enabled_payments: ["credit_card", "gopay", "shopeepay", "other_va", "bca_va", "bni_va", "bri_va"]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // 4. ANALISIS ERROR BERDASARKAN STATUS CODE
      if (response.status === 401) {
        console.error("MIDTRANS_AUTH_FAILED: Token ditolak. Penyebab: Base64 header salah atau Server Key tidak valid untuk environment ini.");
        return res.status(401).json({ 
          error: "MIDTRANS_AUTH_FAILED: Otorisasi gagal. Pastikan Server ID di Vercel Dashboard sudah sesuai dengan environment (Sandbox/Prod) dan tidak ada spasi tambahan." 
        });
      }
      return res.status(response.status).json({ 
        error: data.error_messages?.[0] || "Terjadi kesalahan pada gateway pembayaran." 
      });
    }

    // Berhasil mendapatkan Snap Token
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("SYSTEM_CRITICAL_FAILURE:", error);
    return res.status(500).json({ error: "SISTEM_FAILURE: " + error.message });
  }
}
