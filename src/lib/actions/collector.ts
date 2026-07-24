"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { TelegramNotifier } from "@/lib/telegram/notifier";

export async function inviteContributor(formData: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password?: string;
  telegramUsername: string;
  collectorId: string;
}) {
  const adminSupabase = await createAdminClient();

  if (formData.email) {
    // Validate email format basic
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { error: "Invalid email format" };
    }

    // 1. Check if email already exists in legacy profiles
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", formData.email)
      .single();

    if (existingProfile) {
      // We already have a profile with this email. Do NOT create duplicate.
      return { success: true, id: existingProfile.id };
    }
  }

  let userId: string;
  let hashedPassword = null;

  if (formData.email) {
    // 2. User does not exist, so invite via Supabase Auth
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(formData.email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
      data: {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.status === 422) {
        return { error: "A user with this email already exists." };
      }
      return { error: authError.message };
    }
    
    userId = authData.user.id;
    hashedPassword = await bcrypt.hash(formData.password || "defaultPassword123!", 12);
  } else {
    // Generate UUID manually since we are skipping Supabase Auth
    userId = crypto.randomUUID();
    if (formData.password) {
      hashedPassword = await bcrypt.hash(formData.password, 12);
    }
  }

  // 3. Insert new legacy profile with pending status (activated when user accepts link)
  const { data, error: profileError } = await adminSupabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: formData.fullName,
      phone_number: formData.phoneNumber,
      email: formData.email || null,
      password: hashedPassword,
      telegram_username: formData.telegramUsername.replace("@", ""),
      role: "contributor",
      collector_id: formData.collectorId,
      status: "pending",
    })
    .select("id")
    .single();

  if (profileError) {
    if (formData.email) {
      await adminSupabase.auth.admin.deleteUser(userId);
    }
    return { error: profileError.message };
  }

  return { success: true, id: data.id };
}

export async function getCollectorContributors(collectorId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("group_memberships")
    .select(
      `
      id,
      group_id,
      contributor_id,
      created_at,
      contributor:profiles!group_memberships_contributor_id_fkey(id, full_name, phone_number, email, status),
      group:equb_groups!group_memberships_group_id_fkey(id, name, contribution_amount, total_days, frequency)
    `
    )
    .eq("collector_id", collectorId);

  if (error) return { error: error.message, data: [] };
  // Only return contributors whose profile status is active
  const active = (data as any[])?.filter((c) => c.contributor?.status === "active") ?? [];
  return { data: active, error: null };
}

export async function getPendingContributors(collectorId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, telegram_username, created_at")
    .eq("collector_id", collectorId)
    .eq("status", "pending")
    .eq("role", "contributor")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function addContributor(formData: {
  contributorId: string;
  groupId: string;
  collectorId: string;
  startDate?: string; // ISO date string for the contributor's starting date
}) {
  const supabase = await createAdminClient();
  const insertData: Record<string, unknown> = {
    contributor_id: formData.contributorId,
    group_id: formData.groupId,
    collector_id: formData.collectorId,
  };
  if (formData.startDate) {
    insertData.created_at = formData.startDate;
  }
  const { error } = await supabase.from("group_memberships").insert(insertData);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function updateContributor(data: {
  contributorId: string;
  membershipId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  startDate?: string;
}) {
  const supabase = await createAdminClient();

  // Update profile info
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      email: data.email,
    })
    .eq("id", data.contributorId);

  if (profileError) return { error: profileError.message };

  // Update membership start date if provided
  if (data.startDate) {
    const { error: membershipError } = await supabase
      .from("group_memberships")
      .update({ created_at: data.startDate })
      .eq("id", data.membershipId);

    if (membershipError) return { error: membershipError.message };
  }

  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function deleteContributor(contributorId: string) {
  const supabase = await createAdminClient();

  // Delete the profile — memberships and contributions cascade-delete via FK
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", contributorId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function getContributorCycles(
  contributorId: string,
  groupId: string
) {
  const supabase = await createAdminClient();

  // Fetch cycles, the group's frequency, and the membership's created_at (start date)
  const [cyclesRes, groupRes, membershipRes] = await Promise.all([
    supabase
      .from("contributions")
      .select("*")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .order("cycle_number", { ascending: true }),
    supabase
      .from("equb_groups")
      .select("created_at, frequency")
      .eq("id", groupId)
      .single(),
    supabase
      .from("group_memberships")
      .select("created_at")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .single(),
  ]);

  if (cyclesRes.error) return { error: cyclesRes.error.message, data: [], group: null };

  // Use the membership's created_at (contributor start date) if available,
  // otherwise fall back to the group's created_at
  const startDate = membershipRes.data?.created_at ?? groupRes.data?.created_at;
  const group = groupRes.data
    ? { ...groupRes.data, created_at: startDate ?? groupRes.data.created_at }
    : null;

  return {
    data: (cyclesRes.data as any[]) ?? [],
    group,
    error: null,
  };
}

export async function markCyclePaid(
  contributionId: string,
  groupId: string,
  cycleDateText?: string
) {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  
  // 1. Mark paid
  const { error, data: updatedContribution } = await supabase
    .from("contributions")
    .update({
      is_marked_paid: true,
      contribution_date: now,
    })
    .eq("id", contributionId)
    .select("contributor_id, collector_id")
    .single();

  if (error) return { error: error.message };
  
  // 2. Telegram Notification
  if (updatedContribution) {
    try {
      // Fetch related data
      const { data: details, error: detailsError } = await supabase
        .from("profiles")
        .select(`
          full_name,
          telegram_chat_id,
          telegram_id,
          telegram_notification_prefs (contribution_confirmations)
        `)
        .eq("id", updatedContribution.contributor_id)
        .single();
        
      if (detailsError) {
        console.error("[markCyclePaid] Error fetching details:", detailsError);
      }
        
      const prefs = Array.isArray(details?.telegram_notification_prefs) 
        ? details?.telegram_notification_prefs[0] 
        : details?.telegram_notification_prefs;
        
      const contributorChatId = details?.telegram_chat_id || details?.telegram_id;
      if (contributorChatId && (prefs?.contribution_confirmations ?? true)) {
        const { data: group } = await supabase.from("equb_groups").select("name, contribution_amount").eq("id", groupId).single();
        const { data: collector } = await supabase.from("profiles").select("full_name, telegram_chat_id, telegram_id").eq("id", updatedContribution.collector_id).single();
        
        if (group && collector) {
          const collectorChatId = collector.telegram_chat_id || collector.telegram_id;
          const contribDate = new Date(now).toLocaleDateString();
          const selDates = cycleDateText || "N/A";
          console.log(`[markCyclePaid] Sending telegram to ${contributorChatId} for ${details.full_name}`);
          const tgResult = await TelegramNotifier.sendContributionConfirmation(contributorChatId, {
            contributorName: details.full_name || "Contributor",
            amount: group.contribution_amount,
            groupName: group.name,
            contributionDate: contribDate,
            selectedDates: selDates,
            totalSelected: 1,
            collectorName: collector.full_name || "Your Collector"
          });
          console.log("[markCyclePaid] Notification sent result:", tgResult);

          if (collectorChatId) {
            try {
              await TelegramNotifier.sendCollectorConfirmation(collectorChatId, {
                contributorName: details.full_name || "Contributor",
                amount: group.contribution_amount,
                groupName: group.name,
                contributionDate: contribDate,
                selectedDates: selDates,
                totalSelected: 1
              });
              console.log("[markCyclePaid] Collector notification sent");
            } catch (ce) {
              console.error("[markCyclePaid] Failed to send collector notification:", ce);
            }
          }
        }
      }
    } catch (e) {
      console.error("[markCyclePaid] Failed to send telegram notification:", e);
    }
  }

  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}

export async function markMultipleCyclesPaid(ids: string[], cycleDateText?: string) {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  
  const { error, data: updatedContributions } = await supabase
    .from("contributions")
    .update({ is_marked_paid: true, contribution_date: now })
    .in("id", ids)
    .select("contributor_id, collector_id, group_id");

  if (error) return { error: error.message };
  
  // Group by contributor to avoid spamming multiple messages if they paid multiple cycles
  if (updatedContributions && updatedContributions.length > 0) {
    try {
      const contributorIds = [...new Set(updatedContributions.map(c => c.contributor_id))];
      
      for (const contributorId of contributorIds) {
        const { data: details, error: detailsError } = await supabase
          .from("profiles")
          .select(`
            full_name,
            telegram_chat_id,
            telegram_id,
            telegram_notification_prefs (contribution_confirmations)
          `)
          .eq("id", contributorId)
          .single();
          
        if (detailsError) {
          console.error("[markMultipleCyclesPaid] Error fetching details for", contributorId, detailsError);
        }
          
        const prefs = Array.isArray(details?.telegram_notification_prefs) 
          ? details?.telegram_notification_prefs[0] 
          : details?.telegram_notification_prefs;
          
        const contributorChatId = details?.telegram_chat_id || details?.telegram_id;
        if (contributorChatId && (prefs?.contribution_confirmations ?? true)) {
          const contributorContributions = updatedContributions.filter(c => c.contributor_id === contributorId);
          const groupId = contributorContributions[0].group_id; // Assume all cycles are for the same group (UI groups them)
          
          const { data: group } = await supabase.from("equb_groups").select("name, contribution_amount").eq("id", groupId).single();
          const { data: collector } = await supabase.from("profiles").select("full_name, telegram_chat_id, telegram_id").eq("id", contributorContributions[0].collector_id).single();
          
          if (group && collector) {
            const collectorChatId = collector.telegram_chat_id || collector.telegram_id;
            const totalAmount = group.contribution_amount * contributorContributions.length;
            const contribDate = new Date(now).toLocaleDateString();
            const selDates = cycleDateText || "N/A";
            console.log(`[markMultipleCyclesPaid] Sending telegram to ${contributorChatId} for ${details.full_name}`);
            const tgResult = await TelegramNotifier.sendContributionConfirmation(contributorChatId, {
              contributorName: details.full_name || "Contributor",
              amount: totalAmount,
              groupName: group.name,
              contributionDate: contribDate,
              selectedDates: selDates,
              totalSelected: contributorContributions.length,
              collectorName: collector.full_name || "Your Collector"
            });
            console.log("[markMultipleCyclesPaid] Notification sent result:", tgResult);

            if (collectorChatId) {
              try {
                await TelegramNotifier.sendCollectorConfirmation(collectorChatId, {
                  contributorName: details.full_name || "Contributor",
                  amount: totalAmount,
                  groupName: group.name,
                  contributionDate: contribDate,
                  selectedDates: selDates,
                  totalSelected: contributorContributions.length
                });
                console.log("[markMultipleCyclesPaid] Collector notification sent");
              } catch (ce) {
                console.error("[markMultipleCyclesPaid] Failed to send collector notification:", ce);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("[markMultipleCyclesPaid] Failed to send telegram notifications for multiple cycles:", e);
    }
  }

  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}

export async function createContributionCycles(
  contributorId: string,
  collectorId: string,
  groupId: string,
  totalDays: number
) {
  const supabase = await createAdminClient();

  const cycles = Array.from({ length: totalDays }, (_, i) => ({
    contributor_id: contributorId,
    collector_id: collectorId,
    group_id: groupId,
    cycle_number: i + 1,
    is_marked_paid: false,
    disbursed: false,
  }));

  const { error } = await supabase.from("contributions").insert(cycles);
  if (error) return { error: error.message };
  return { success: true };
}

export async function disburseFunds(groupId: string, contributorId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("contributions")
    .update({ disbursed: true })
    .eq("group_id", groupId)
    .eq("contributor_id", contributorId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function getCollectorStats(collectorId: string) {
  const supabase = await createAdminClient();

  const [membershipsRes, paidRes, totalRes] = await Promise.all([
    supabase
      .from("group_memberships")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId),
    supabase
      .from("contributions")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId)
      .eq("is_marked_paid", true),
    supabase
      .from("contributions")
      .select("id", { count: "exact" })
      .eq("collector_id", collectorId),
  ]);

  return {
    totalContributors: membershipsRes.count ?? 0,
    paidCycles: paidRes.count ?? 0,
    totalCycles: totalRes.count ?? 0,
  };
}

export async function getCollectorReports(
  collectorId: string,
  fromDate?: string,
  toDate?: string
) {
  const supabase = await createAdminClient();
  let query = supabase
    .from("contributions")
    .select(
      `
      id,
      cycle_number,
      contribution_date,
      is_marked_paid,
      contributor:profiles!contributions_contributor_id_fkey(full_name, phone_number),
      group:equb_groups!contributions_group_id_fkey(name, contribution_amount)
    `
    )
    .eq("collector_id", collectorId)
    .eq("is_marked_paid", true)
    .order("contribution_date", { ascending: false });

  if (fromDate) query = query.gte("contribution_date", fromDate);
  if (toDate) query = query.lte("contribution_date", toDate);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getCollectorGroups(collectorId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("equb_groups")
    .select("*, group_memberships(id)")
    .eq("collector_id", collectorId);
  if (error) return { error: error.message, data: [] };
  
  const mapped = data?.map((g: any) => ({
    ...g,
    member_count: g.group_memberships?.length || 0,
  }));
  
  return { data: mapped ?? [], error: null };
}

export async function createEqubGroup(formData: {
  name: string;
  contributionAmount: number;
  totalDays: number;
  frequency: "daily" | "weekly" | "monthly";
  collectorId: string;
}) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("equb_groups")
    .insert({
      name: formData.name,
      contribution_amount: formData.contributionAmount,
      total_days: formData.totalDays,
      frequency: formData.frequency,
      collector_id: formData.collectorId,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { success: true, group: data };
}

export async function getGroupContributors(groupId: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("group_memberships")
    .select(`
      id,
      contributor:profiles!contributor_id(
        id,
        full_name,
        phone_number,
        email,
        status
      )
    `)
    .eq("group_id", groupId);
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}
