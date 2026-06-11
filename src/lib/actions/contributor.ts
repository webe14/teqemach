"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getContributorStats(contributorId: string) {
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
      .select(
        `group:equb_groups!group_memberships_group_id_fkey(contribution_amount, total_days, frequency)`
      )
      .eq("contributor_id", contributorId)
      .limit(1)
      .single(),
  ]);

  const paidCount = paidRes.count ?? 0;
  const totalCount = totalRes.count ?? 0;
  const group = groupRes.data?.group as
    | { contribution_amount: number; total_days: number; frequency: string }
    | null
    | undefined;

  const amountSaved = paidCount * (group?.contribution_amount ?? 0);
  const daysRemaining = (group?.total_days ?? 0) - paidCount;

  return {
    amountSaved,
    daysRemaining,
    paidCycles: paidCount,
    totalCycles: totalCount,
    group,
  };
}

export async function getContributorPaymentHistory(
  contributorId: string,
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
      collector:profiles!contributions_collector_id_fkey(full_name),
      group:equb_groups!contributions_group_id_fkey(name, contribution_amount)
    `
    )
    .eq("contributor_id", contributorId)
    .eq("is_marked_paid", true)
    .order("contribution_date", { ascending: false });

  if (fromDate) query = query.gte("contribution_date", fromDate);
  if (toDate) query = query.lte("contribution_date", toDate);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getContributorRules(contributorId: string) {
  const supabase = await createAdminClient();
  // Find this contributor's collector
  const { data: membership } = await supabase
    .from("group_memberships")
    .select("collector_id")
    .eq("contributor_id", contributorId)
    .limit(1)
    .single();

  if (!membership) return { data: [], error: null };

  const { data, error } = await supabase
    .from("contribution_rules")
    .select("*")
    .eq("collector_id", membership.collector_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}
