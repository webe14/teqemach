-- Create the telegram_users table
CREATE TABLE IF NOT EXISTS telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT,
  role TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Admins can view/edit everything.
-- For service_role (which our server uses), RLS is bypassed.
CREATE POLICY "Admins can view all telegram users"
  ON telegram_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_telegram_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_telegram_users_modtime ON telegram_users;
CREATE TRIGGER update_telegram_users_modtime
BEFORE UPDATE ON telegram_users
FOR EACH ROW
EXECUTE FUNCTION update_telegram_users_updated_at();
