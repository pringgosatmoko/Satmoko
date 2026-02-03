// SATMOKO SNAP TOKEN GENERATOR V10.2 - ULTIMATE STABLE
// Fix: Menggunakan Buffer (Node.js) untuk encoding Auth Header agar lolos verifikasi Midtrans

// Explicitly import Buffer from 'buffer' to fix "Cannot find name 'Buffer'" in TypeScript/Node environments.
import { Buffer } from 'buffer';

export default async function handler(req: any, res: any) {
  // Hanya izinkan request POST
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { orderId, amount, email, fullName } = req.body;
    
    // 1. Ambil Server Key dari Env Vercel
    // Master: Pastikan VITE_MIDTRANS_SERVER_KEY sudah diisi di Vercel Dashboard!
    const serverKey = (process.env.VITE_MIDTRANS_SERVER_KEY || "").trim();
    
    if (!serverKey) {
      return res.status(500).json({ 
        error: "KONFIGURASI_ERROR: Server Key (VITE_MIDTRANS_SERVER_KEY) tidak ditemukan di Environment Variable Vercel." 
      });
    }

    // 2. Encoding Basic Auth menggunakan Buffer (Standar Node.js yang paling kompatibel dengan Midtrans)
    // Format wajib: base64(server_key + ":")
    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    // 3. Deteksi Environment (Case-Insensitive)
    const isSandbox = serverKey.toUpperCase().startsWith('SB-');
    const baseUrl = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    // 4. Kirim Request ke API Midtrans
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: {
          first_name: fullName,
          email: email,
        },
        usage_limit: 1,
        enabled_payments: ["credit_card", "gopay", "shopeepay", "permata_va", "bca_va", "bni_va", "bri_va", "other_va"]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Jika error 401 (Unauthorized)
      if (response.status === 401) {
        return res.status(401).json({ 
          error: `AUTH_FAILED (401): Akses Ditolak.\n\nMaster, mohon verifikasi:\n1. Di Vercel, pastikan VITE_MIDTRANS_SERVER_KEY adalah SERVER KEY (Bukan Client Key).\n2. Cek apakah Master menggunakan Key Sandbox (SB-) tapi mencoba akses Production, atau sebaliknya.\n3. Salin ulang Server Key dari Dashboard Midtrans Settings > Access Keys.`
        });
      }
      return res.status(response.status).json({ 
        error: "MIDTRANS_API_ERROR: " + (data.error_messages?.[0] || "Terjadi kesalahan pada server Midtrans.")
      });
    }

    // Berhasil mendapatkan Token Snap
    return res.status(200).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: "SISTEM_FAILURE: " + error.message });
  }
}