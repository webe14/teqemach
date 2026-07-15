"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./auth";

export async function getNotificationPreferences() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("telegram_notification_prefs")
    .select("*")
    .eq("user_id", profile.id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching notification prefs:", error);
  }

  return data;
}

export async function updateNotificationPreferences(prefs: {
  contribution_confirmations?: boolean;
  daily_reports?: boolean;
  weekly_reports?: boolean;
  payment_reminders?: boolean;
  broadcast_announcements?: boolean;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");

  const supabase = await createAdminClient();
  
  // check if prefs exist
  const { data: existing } = await supabase
    .from("telegram_notification_prefs")
    .select("id")
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("telegram_notification_prefs")
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq("user_id", profile.id);
      
    if (error) throw new Error("Failed to update preferences");
  } else {
    const { error } = await supabase
      .from("telegram_notification_prefs")
      .insert({ user_id: profile.id, ...prefs });
      
    if (error) throw new Error("Failed to create preferences");
  }

  return { success: true };
}
