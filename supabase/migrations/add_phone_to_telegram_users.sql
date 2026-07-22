-- Add phone_number column to telegram_users table
-- Stores the verified phone number received via Telegram's request_contact flow
ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS phone_number TEXT;
