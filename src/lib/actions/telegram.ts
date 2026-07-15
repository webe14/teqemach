"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./auth";
import { createOTP } from "@/lib/telegram/otp";

export async function linkTelegramAccount(
  userId: string,
  telegramId: number,
  chatId: number,
  username?: string,
  firstName?: string
) {
  const supabase = await createAdminClient();
  
  // Check if telegram account is already linked to another user
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId)
    .neq("id", userId)
    .single();

  if (existingUser) {
    throw new Error("This Telegram account is already linked to another user.");
  }

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({
      telegram_id: telegramId,
      telegram_chat_id: chatId,
      telegram_username: username || firstName || null,
      telegram_verified: true,
      telegram_linked_at: new Date().toISOString(),
      telegram_last_seen: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error linking telegram account:", error);
    throw new Error("Failed to link Telegram account.");
  }

  // Ensure notification prefs exist
  const { data: prefs } = await supabase
    .from("telegram_notification_prefs")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!prefs) {
    await supabase.from("telegram_notification_prefs").insert({ user_id: userId });
  }

  return { success: true };
}

export async function unlinkTelegramAccount() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      telegram_id: null,
      telegram_chat_id: null,
      telegram_username: null,
      telegram_verified: false,
      telegram_linked_at: null,
      telegram_last_seen: null,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Error unlinking telegram account:", error);
    throw new Error("Failed to unlink Telegram account.");
  }

  return { success: true };
}

export async function getTelegramStatus() {
  const profile = await getCurrentProfile();
  if (!profile) return { linked: false };

  return {
    linked: !!profile.telegram_id,
    username: profile.telegram_username,
  };
}

export async function generateTelegramLinkUrl() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "TeqemachBot";
  const token = await createOTP(profile.id, "telegram_link", 10, true);
  
  return `https://t.me/${botUsername}?start=${token}`;
}

export async function getUserByTelegramId(telegramId: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();
    
  if (error || !data) return null;
  return data;
}

export async function updateTelegramLastSeen(telegramId: number) {
  const supabase = await createAdminClient();
  await supabase
    .from("profiles")
    .update({ telegram_last_seen: new Date().toISOString() })
    .eq("telegram_id", telegramId);
}
