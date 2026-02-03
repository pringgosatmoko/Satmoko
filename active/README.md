# Satmoko Studio AI v8.0

## Setup Instructions
1. **Supabase**: Create tables `members`, `topup_requests`, `direct_messages`, and `settings`.
2. **Environment**: Configure variables in Vercel/Netlify dashboard using EXACT names provided.
3. **Midtrans**: Set Snap notification URL to `[your-domain]/api/midtrans/notificationWebhook`.

## System Logic
- **Authorization**: Supabase Auth for users. Whitelist check for Admins via `VITE_ADMIN_EMAILS` and bypass via `VITE_PASSW`.
- **Payment Flow**: 
    - Client generates Snap Token via `/api/midtrans/createTransaction`.
    - Snap UI handles the user interface.
    - Webhook updates database and activates accounts.
- **AI Engine**: 
    - Uses Gemini API with automatic rotation through three distinct slots.
    - Model selection: `gemini-3-flash-preview` for chat, `gemini-3-pro-image-preview` for art.
- **Telegram**: Bot sends markdown-formatted notifications for key system events.