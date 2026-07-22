-- Drop the unique constraint on telegram_id in profiles table to allow a user to have multiple roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_telegram_id_key;
