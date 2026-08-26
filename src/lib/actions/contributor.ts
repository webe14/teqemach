"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getContributorStats(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const [paidRes, totalRes, groupRes] = await Promise.all([
      supabase
        .from("contributions")
        .select("id", { count: "exact" })
        .eq("contributor_id", contributorId)
        .eq("is_marked_paid", true),
      supabase
        .from("contributions")
        .select("id", { count: "exact" })
        .eq("contributor_id", contributorId),
      supabase
        .from("group_memberships")
        .select("group_id")
        .eq("contributor_id", contributorId)
        .limit(1)
        .maybeSingle(),
    ]);

    const paidCount = paidRes?.count ?? 0;
    const totalCount = totalRes?.count ?? 0;
    
    let group: any = null;
    if (groupRes?.data?.group_id) {
      const { data: gData } = await supabase
        .from("equb_groups")
        .select("id, name, contribution_amount, total_days, frequency")
        .eq("id", groupRes.data.group_id)
        .maybeSingle();
      group = gData;
    }

    const amountSaved = paidCount * (group?.contribution_amount ?? 0);
    const daysRemaining = Math.max(0, (group?.total_days ?? 0) - paidCount);

    return {
      amountSaved,
      daysRemaining,
      paidCycles: paidCount,
      totalCycles: totalCount,
      group,
    };
  } catch (e) {
    console.error("Failed to load contributor stats:", e);
    return {
      amountSaved: 0,
      daysRemaining: 0,
      paidCycles: 0,
      totalCycles: 0,
      group: null,
    };
  }
}

export async function getContributorPaymentHistory(
  contributorId: string,
  fromDate?: string,
  toDate?: string
) {
  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from("contributions")
      .select("id, cycle_number, contribution_date, is_marked_paid, group_id, collector_id")
      .eq("contributor_id", contributorId)
      .eq("is_marked_paid", true)
      .order("contribution_date", { ascending: false });

    if (fromDate) query = query.gte("contribution_date", fromDate);
    if (toDate) query = query.lte("contribution_date", toDate);

    const { data, error } = await query;
    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function getContributorRules(contributorId: string) {
  try {
    const supabase = await createAdminClient();
    const { data: membership } = await supabase
      .from("group_memberships")
      .select("collector_id")
      .eq("contributor_id", contributorId)
      .limit(1)
      .maybeSingle();

    if (!membership?.collector_id) return { data: [], error: null };

    const { data, error } = await supabase
      .from("contribution_rules")
      .select("*")
      .eq("collector_id", membership.collector_id)
      .order("created_at", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function getPublicEqubGroups() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("equb_groups")
      .select("id, name, contribution_amount, total_days, frequency, collector_id, created_at")
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function requestJoinGroup(contributorId: string, groupId: string) {
  try {
    const supabase = await createAdminClient();

    // Check if already a member in group_memberships
    const { data: existing } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (existing) {
      return { error: "You are already a member of this group.", success: false };
    }

    // Get the group's collector_id and name
    const { data: group } = await supabase
      .from("equb_groups")
      .select("collector_id, name")
      .eq("id", groupId)
      .single();

    if (!group) {
      return { error: "Group not found.", success: false };
    }

    // 1. Update contributor profile status to 'pending' and set collector_id
    // This makes them show up in Admin's "Pending Requests / Invitations" list
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        status: "pending",
        collector_id: group.collector_id,
      })
      .eq("id", contributorId);

    if (profileError) return { error: profileError.message, success: false };

    // 2. Send a notification to the admin/collector
    try {
      await supabase.from("notifications").insert({
        user_id: group.collector_id,
        title: "New Join Request",
        body: `A contributor requested to join "${group.name}".`,
        type: "join_request",
        read: false,
      });
    } catch {
      // Non-critical
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { error: err.message, success: false };
  }
}
