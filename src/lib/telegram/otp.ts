import { createAdminClient } from "@/lib/supabase/server";
import { TelegramNotifier } from "./notifier";
import crypto from "crypto";

export async function generateOTP(): Promise<string> {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateLinkToken(): Promise<string> {
  return crypto.randomBytes(16).toString('hex');
}

export async function createOTP(userId: string, purpose: string, expiresInMinutes = 10, isToken = false): Promise<string> {
  const supabase = await createAdminClient();
  const code = isToken ? await generateLinkToken() : await generateOTP();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60000).toISOString();

  const { error } = await supabase.from("telegram_otps").insert({
    user_id: userId,
    otp_code: code,
    purpose: purpose,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Error creating OTP:", error);
    throw new Error("Failed to generate OTP");
  }

  return code;
}

export async function verifyOTP(userId: string, code: string, purpose: string): Promise<boolean> {
  const supabase = await createAdminClient();
  
  // Find the valid OTP
  const { data, error } = await supabase
    .from("telegram_otps")
    .select("id, expires_at, used")
    .eq("user_id", userId)
    .eq("otp_code", code)
    .eq("purpose", purpose)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return false;
  }

  // Check expiration
  if (new Date(data.expires_at) < new Date()) {
    return false;
  }

  // Mark as used
  await supabase
    .from("telegram_otps")
    .update({ used: true })
    .eq("id", data.id);

  return true;
}

export async function cleanupExpiredOTPs() {
  const supabase = await createAdminClient();
  await supabase
    .from("telegram_otps")
    .delete()
    .lt("expires_at", new Date().toISOString());
}
