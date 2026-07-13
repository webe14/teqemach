"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getNotifications(userId: string) {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data ?? [], error: null };
}

export async function getUnreadNotificationCount(userId: string) {
  const adminClient = await createAdminClient();
  const { count, error } = await adminClient
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function approveContributor(contributorId: string, notificationId: string) {
  const adminClient = await createAdminClient();

  // Update contributor status to active
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ status: "active" })
    .eq("id", contributorId);

  if (profileError) return { error: profileError.message };

  // Mark notification as read
  await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  // Send approval notification to the contributor
  const { data: collector } = await adminClient
    .from("notifications")
    .select("user_id")
    .eq("id", notificationId)
    .single();

  if (collector) {
    const { data: collectorProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", collector.user_id)
      .single();

    await adminClient.from("notifications").insert({
      user_id: contributorId,
      type: "approved",
      title: "Registration Approved!",
      message: `Your registration has been approved by ${collectorProfile?.full_name ?? "the collector"}. You can now log in.`,
      data: { collector_id: collector.user_id },
    });
  }

  revalidatePath("/dashboard/collector");
  return { success: true };
}

export async function rejectContributor(contributorId: string, notificationId: string) {
  const adminClient = await createAdminClient();

  // Update contributor status to rejected
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", contributorId);

  if (profileError) return { error: profileError.message };

  // Mark notification as read
  await adminClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  revalidatePath("/dashboard/collector");
  return { success: true };
}
