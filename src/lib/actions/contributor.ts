"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getContributorStats(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const [paidRes, totalRes, membershipsRes] = await Promise.all([
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
        .select(`
          id,
          created_at,
          equb_groups (
            id,
            name,
            contribution_amount,
            total_days,
            frequency,
            collector:profiles!collector_id (
              full_name,
              phone_number
            )
          )
        `)
        .eq("contributor_id", contributorId),
    ]);

    const paidCount = paidRes?.count ?? 0;
    const totalCount = totalRes?.count ?? 0;
    
    const groups: any[] = (membershipsRes?.data as any[])
      ?.map((m) => m.equb_groups)
      .filter(Boolean) ?? [];

    const primaryGroup = groups[0] || null;

    const amountSaved = paidCount * (primaryGroup?.contribution_amount ?? 0);
    const daysRemaining = Math.max(0, (primaryGroup?.total_days ?? 0) - paidCount);

    return {
      amountSaved,
      daysRemaining,
      paidCycles: paidCount,
      totalCycles: totalCount,
      group: primaryGroup,
      groups,
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
      .select(`
        id,
        cycle_number,
        contribution_date,
        is_marked_paid,
        group_id,
        collector_id,
        created_at,
        group:equb_groups!contributions_group_id_fkey (
          id,
          name,
          contribution_amount,
          total_days,
          frequency,
          created_at
        ),
        collector:profiles!contributions_collector_id_fkey (
          full_name,
          phone_number
        )
      `)
      .eq("contributor_id", contributorId)
      .eq("is_marked_paid", true)
      .order("cycle_number", { ascending: true });

    if (fromDate) query = query.gte("contribution_date", fromDate);
    if (toDate) query = query.lte("contribution_date", toDate);

    const { data, error } = await query;
    if (error) return { error: error.message, data: [] };

    const formatted = ((data as any[]) ?? []).map((row) => {
      let cDate = row.contribution_date;
      if (!cDate && row.group?.created_at) {
        const start = new Date(row.group.created_at);
        const n = (row.cycle_number || 1) - 1;
        if (row.group.frequency === "weekly") {
          start.setUTCDate(start.getUTCDate() + n * 7);
        } else if (row.group.frequency === "monthly") {
          start.setUTCMonth(start.getUTCMonth() + n);
        } else {
          start.setUTCDate(start.getUTCDate() + n);
        }
        cDate = start.toISOString();
      }
      return {
        ...row,
        contribution_date: cDate,
      };
    });

    return { data: formatted, error: null };
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
      .order("contribution_amount", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data: (data as any[]) ?? [], error: null };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function requestJoinGroup(contributorId: string, groupId: string, startDate?: string) {
  try {
    const supabase = await createAdminClient();

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
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        status: "pending",
        collector_id: group.collector_id,
      })
      .eq("id", contributorId);

    if (profileError) return { error: profileError.message, success: false };

    // 2. Insert or update requested group_membership
    const { data: existing } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("contributor_id", contributorId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (!existing) {
      const membershipData: Record<string, unknown> = {
        contributor_id: contributorId,
        group_id: groupId,
        collector_id: group.collector_id,
      };
      if (startDate) {
        membershipData.created_at = startDate;
      }
      await supabase.from("group_memberships").insert(membershipData);
    } else if (startDate) {
      await supabase
        .from("group_memberships")
        .update({ created_at: startDate })
        .eq("id", existing.id);
    }

    // 3. Send a notification to the admin/collector
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
