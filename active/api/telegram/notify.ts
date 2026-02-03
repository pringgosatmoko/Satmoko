export default async function handler(req: any, res: any) {
  const { message } = req.body;
  const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VITE_TELEGRAM_CHAT_ID;

  if (!token || !chatId) return res.status(500).json({ error: "Missing bot credentials" });

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚀 *SATMOKO HUB NOTIFICATION*\n\n${message}`,
        parse_mode: 'Markdown'
      })
    });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}