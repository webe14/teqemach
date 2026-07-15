"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./auth";
import { TelegramNotifier } from "@/lib/telegram/notifier";

export async function broadcastToTelegram(message: string, targetRoles: string[] = ["all"]) {
  const profile = await getCurrentProfile();
  
  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Only admins can send broadcasts.");
  }

  const supabase = await createAdminClient();
  let query = supabase
    .from("profiles")
    .select("telegram_chat_id, telegram_notification_prefs!inner(broadcast_announcements)")
    .not("telegram_chat_id", "is", null);

  if (!targetRoles.includes("all")) {
    query = query.in("role", targetRoles);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching broadcast targets:", error);
    throw new Error("Failed to fetch target users.");
  }

  let successCount = 0;
  let failCount = 0;

  for (const user of data || []) {
    const prefs = Array.isArray(user.telegram_notification_prefs) 
      ? user.telegram_notification_prefs[0] 
      : user.telegram_notification_prefs;
      
    if (user.telegram_chat_id && prefs?.broadcast_announcements) {
      try {
        await TelegramNotifier.sendBroadcast(user.telegram_chat_id, message);
        successCount++;
      } catch (e) {
        console.error("Failed to send broadcast to", user.telegram_chat_id, e);
        failCount++;
      }
    }
  }

  return { success: true, successCount, failCount };
}
