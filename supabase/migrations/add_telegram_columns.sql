-- Add Telegram-related columns to the profiles table
-- Run this in your Supabase SQL Editor

-- Add telegram_username column (stores the @username without the @ prefix)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Add telegram_id column (the numeric Telegram user ID)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

-- Add telegram_verified flag (true when the user has accepted the invitation link)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false;

-- Add telegram_linked_at timestamp (when the user accepted the link)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;
