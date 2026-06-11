"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
      contributor:profiles!group_memberships_contributor_id_fkey(id, full_name, phone_number, email),
      group:equb_groups!group_memberships_group_id_fkey(id, name, contribution_amount, total_days, frequency)
    `
    )
    .eq("collector_id", collectorId);

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
  groupId: string
) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("contributions")
    .update({
      is_marked_paid: true,
      contribution_date: new Date().toISOString(),
    })
    .eq("id", contributionId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/collector/contributors`);
  return { success: true };
}

export async function markMultipleCyclesPaid(ids: string[]) {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("contributions")
    .update({ is_marked_paid: true, contribution_date: now })
    .in("id", ids);

  if (error) return { error: error.message };
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
    .select("*")
    .eq("collector_id", collectorId);
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
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
