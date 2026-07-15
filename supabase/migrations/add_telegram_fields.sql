-- Alter profiles table to add Telegram fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_last_seen TIMESTAMPTZ;

-- Create telegram_otps table
CREATE TABLE IF NOT EXISTS telegram_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('password_reset','account_verify','telegram_link','sensitive_action')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on telegram_otps
ALTER TABLE telegram_otps ENABLE ROW LEVEL SECURITY;

-- Create telegram_notification_prefs table
CREATE TABLE IF NOT EXISTS telegram_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_confirmations BOOLEAN DEFAULT true,
  daily_reports BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  broadcast_announcements BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on telegram_notification_prefs
ALTER TABLE telegram_notification_prefs ENABLE ROW LEVEL SECURITY;
