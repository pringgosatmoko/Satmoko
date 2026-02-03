
// SATMOKO SNAP TOKEN GENERATOR V9.9 - STABLE
// Pastikan VITE_MIDTRANS_SERVER_KEY sudah terpasang di Dashboard Hosting (Vercel)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { orderId, amount, email, fullName } = req.body;
  
  // Ambil Server Key dari Env. Prioritaskan VITE_MIDTRANS_SERVER_KEY
  const serverKey = process.env.VITE_MIDTRANS_SERVER_KEY || process.env.VITE_MIDTRANS_SERVER_ID || "";
  
  if (!serverKey || serverKey === "") {
    return res.status(500).json({ 
      error: "KONFIGURASI_ERROR: Server Key tidak ditemukan. Pastikan variabel VITE_MIDTRANS_SERVER_KEY sudah diisi di Dashboard Vercel Master." 
    });
  }

  // Penting: Midtrans butuh Basic Auth (server_key:). 
  // Merchant ID tidak bisa digunakan sebagai server_key.
  // Fix: Use btoa instead of Buffer for base64 encoding to resolve "Cannot find name 'Buffer'" error in TypeScript environments without Node.js types.
  const authString = btoa(`${serverKey}:`);

  const payload = {
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
  };

  try {
    // Deteksi mode berdasarkan awalan key (SB- adalah sandbox)
    const isProduction = !serverKey.startsWith('SB-');
    const baseUrl = isProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions' 
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // Jika error 401/Unauthorized, hampir pasti karena Server Key salah atau format base64 salah.
      if (response.status === 401) {
        return res.status(401).json({ 
          error: "MIDTRANS_AUTH_ERROR: Akses Ditolak (401). Master, pastikan Server Key sudah benar (Bukan Merchant ID) dan sesuai dengan lingkungannya (Sandbox vs Production)."
        });
      }
      return res.status(response.status).json({ 
        error: "MIDTRANS_API_ERROR: " + (data.error_messages?.[0] || "Terjadi kesalahan pada server Midtrans.")
      });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "SISTEM_OFFLINE: " + error.message });
  }
}
