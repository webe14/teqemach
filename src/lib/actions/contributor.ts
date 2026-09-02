"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getContributorStats(contributorId: string) {
  try {
    const supabase = await createAdminClient();

    const [membershipsRes, contributionsRes] = await Promise.all([
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
      supabase
        .from("contributions")
        .select("id, group_id, is_marked_paid, equb_groups:group_id(contribution_amount)")
        .eq("contributor_id", contributorId),
    ]);

    const allContributions = contributionsRes?.data || [];
    const totalCount = allContributions.length;

    // Aggregate counts per group
    const paidByGroup: Record<string, number> = {};
    const totalByGroup: Record<string, number> = {};
    const amountByGroup: Record<string, number> = {};

    let totalPaidGlobal = 0;
    let totalAmountSavedGlobal = 0;

    for (const item of allContributions as any[]) {
      const gid = item.group_id;
      if (gid) {
        totalByGroup[gid] = (totalByGroup[gid] || 0) + 1;
      }
      if (item.is_marked_paid) {
        totalPaidGlobal++;
        const amt = Number(item.equb_groups?.contribution_amount || 0);
        totalAmountSavedGlobal += amt;
        if (gid) {
          paidByGroup[gid] = (paidByGroup[gid] || 0) + 1;
          amountByGroup[gid] = (amountByGroup[gid] || 0) + amt;
        }
      }
    }

    const rawGroups: any[] = (membershipsRes?.data as any[])
      ?.map((m) => m.equb_groups)
      .filter(Boolean) ?? [];

    const groups = rawGroups.map((g) => {
      const gPaid = paidByGroup[g.id] ?? 0;
      const gTotal = g.total_days || totalByGroup[g.id] || 30;
      const gAmount = amountByGroup[g.id] ?? (gPaid * (g.contribution_amount || 0));
      const gRemaining = Math.max(0, gTotal - gPaid);

      return {
        ...g,
        paidCycles: gPaid,
        totalCycles: gTotal,
        amountSaved: gAmount,
        daysRemaining: gRemaining,
      };
    });

    const primaryGroup = groups[0] || null;
    const primaryPaid = primaryGroup?.paidCycles ?? totalPaidGlobal;
    const primaryRemaining = primaryGroup?.daysRemaining ?? 0;
    const primaryAmount = primaryGroup?.amountSaved ?? totalAmountSavedGlobal;

    return {
      amountSaved: totalAmountSavedGlobal,
      daysRemaining: primaryRemaining,
      paidCycles: primaryPaid,
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

    const formatted = ((data as any[]) ?? []).map((row) => ({
      ...row,
      contribution_date: row.contribution_date || row.created_at,
    }));

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
