
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { order_id, status_code, gross_amount, signature_key, transaction_status } = req.body;
  const serverId = process.env.VITE_MIDTRANS_SERVER_ID || "";

  const hash = crypto.createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverId}`)
    .digest('hex');

  if (hash !== signature_key) return res.status(401).json({ message: 'Invalid Signature' });

  const supabase = createClient(
    process.env.VITE_DATABASE_URL || "",
    process.env.VITE_SUPABASE_ANON || ""
  );

  if (transaction_status === 'settlement' || transaction_status === 'capture') {
    const { data: members } = await supabase.from('members').select('*').filter('metadata->>order_id', 'eq', order_id);
    const member = members?.[0];

    if (member) {
      const { credits_to_add, days_to_add } = member.metadata;
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (days_to_add || 30));

      await supabase.from('members').update({
        status: 'active',
        credits: Number(member.credits || 0) + Number(credits_to_add || 0),
        valid_until: newExpiry.toISOString(),
      }).eq('email', member.email);
    }
  }
  return res.status(200).send('OK');
}
