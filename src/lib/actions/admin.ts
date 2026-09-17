"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

/**
 * Register a new collector or contributor.
 * - Does NOT create a Supabase Auth user.
 * - Stores email + bcrypt-hashed password directly in the profiles table.
 */
export async function registerUser(formData: {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  role: "collector" | "contributor";
  collectorId?: string;
}) {
  const adminSupabase = await createAdminClient();

  // Create user in Supabase Auth first
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Bypass email verification
    user_metadata: {
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

  // Hash password before storing (preserves current DB structure and backward compatibility)
  const hashedPassword = await bcrypt.hash(formData.password, 12);

  // Insert directly into profiles linking to the new Supabase Auth user ID
  const { data, error: profileError } = await adminSupabase
    .from("profiles")
    .insert({
      id: authData.user.id,
      full_name: formData.fullName,
      phone_number: formData.phoneNumber,
      email: formData.email,
      password: hashedPassword,
      role: formData.role,
      collector_id: formData.role === "contributor" ? (formData.collectorId || null) : null,
    })
    .select("id")
    .single();

  if (profileError) {
    // If profile insert fails, we should ideally delete the auth user to rollback, 
    // but at minimum surface the error.
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/dashboard/admin/management");
  return { success: true, id: data.id };
}

export async function getAdminStats() {
  const supabase = await createAdminClient();

  const [collectorsRes, equbsRes, contributionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .in("role", ["admin", "collector"]),
    supabase.from("equb_groups").select("id, contribution_amount", { count: "exact" }),
    supabase
      .from("contributions")
      .select("id")
      .eq("is_marked_paid", true),
  ]);

  const totalCollectors = collectorsRes.count ?? 0;
  const activeEqubs = equbsRes.count ?? 0;
  const equbs = equbsRes.data ?? [];
  const totalCapital = equbs.reduce(
    (sum, g) => sum + (g.contribution_amount ?? 0),
    0
  );

  return { totalCollectors, activeEqubs, totalCapital };
}

export async function getAllProfiles() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, role, email, created_at")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getCollectors() {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, full_name, phone_number, email")
    .in("role", ["admin", "collector"])
    .order("full_name", { ascending: true });
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getFinancialReport(fromDate?: string, toDate?: string) {
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
      collector:profiles!contributions_collector_id_fkey(full_name),
      group:equb_groups!contributions_group_id_fkey(name, contribution_amount)
    `
    )
    .eq("is_marked_paid", true)
    .order("contribution_date", { ascending: false });

  if (fromDate) query = query.gte("contribution_date", fromDate);
  if (toDate) query = query.lte("contribution_date", toDate);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getAllContributors() {
  const supabase = await createAdminClient();

  // 1. Fetch all active contributor profiles
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, email, status, created_at, collector_id")
    .eq("role", "contributor")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (profError || !profiles) {
    return { error: profError?.message || "Failed to fetch contributors", data: [] };
  }

  // 2. Fetch all group memberships with group details
  const { data: memberships } = await supabase
    .from("group_memberships")
    .select(`
      id,
      group_id,
      contributor_id,
      created_at,
      collector_id,
      group:equb_groups!group_memberships_group_id_fkey(id, name, contribution_amount, total_days, frequency)
    `);

  const membershipsByContributor: Record<string, any[]> = {};
  if (memberships) {
    for (const m of memberships) {
      if (!membershipsByContributor[m.contributor_id]) {
        membershipsByContributor[m.contributor_id] = [];
      }
      membershipsByContributor[m.contributor_id].push(m);
    }
  }

  const result: any[] = [];

  for (const p of profiles) {
    const userMemberships = membershipsByContributor[p.id];
    if (userMemberships && userMemberships.length > 0) {
      for (const m of userMemberships) {
        result.push({
          id: m.id,
          group_id: m.group_id,
          contributor_id: p.id,
          created_at: m.created_at || p.created_at,
          collector_id: m.collector_id || p.collector_id,
          contributor: {
            id: p.id,
            full_name: p.full_name,
            phone_number: p.phone_number,
            email: p.email,
            status: p.status,
          },
          group: m.group,
        });
      }
    } else {
      result.push({
        id: p.id,
        group_id: "",
        contributor_id: p.id,
        created_at: p.created_at,
        collector_id: p.collector_id,
        contributor: {
          id: p.id,
          full_name: p.full_name,
          phone_number: p.phone_number,
          email: p.email,
          status: p.status,
        },
        group: null,
      });
    }
  }

  return { data: result, error: null };
}

export async function getAllPendingContributors() {
  const supabase = await createAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, telegram_username, created_at, collector_id")
    .eq("status", "pending")
    .eq("role", "contributor")
    .order("created_at", { ascending: false });

  if (error || !profiles) return { error: error?.message, data: [] };

  // Fetch pending group memberships separately to avoid PostgREST relationship ambiguity
  const profileIds = profiles.map((p) => p.id);
  let membershipsMap: Record<string, any> = {};

  if (profileIds.length > 0) {
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("contributor_id, group_id, created_at, equb_groups(id, name, total_days)")
      .in("contributor_id", profileIds);

    if (memberships) {
      for (const m of memberships) {
        membershipsMap[m.contributor_id] = m;
      }
    }
  }

  const formatted = profiles.map((profile) => {
    const m = membershipsMap[profile.id];
    const group = m?.equb_groups;
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      telegram_username: profile.telegram_username,
      created_at: profile.created_at,
      collector_id: profile.collector_id,
      requested_group_id: group?.id || null,
      requested_group_name: group?.name || null,
      requested_start_date: m?.created_at || profile.created_at,
    };
  });

  return { data: formatted, error: null };
}

export async function getAllGroups() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("equb_groups")
    .select("id, name, contribution_amount, total_days, frequency, collector_id")
    .order("contribution_amount", { ascending: false });
    
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function approveContributor(contributorId: string, groupId: string, collectorId: string, startDate?: string) {
  const supabase = await createAdminClient();
  
  // 1. Update status to active and assign collector if provided
  const profileUpdate: Record<string, unknown> = { status: "active" };
  if (collectorId) {
    profileUpdate.collector_id = collectorId;
  }
  const { error: updateError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", contributorId);
    
  if (updateError) return { error: updateError.message };

  // 2. Check if a membership for this contributor and group already exists
  const { data: existingForGroup } = await supabase
    .from("group_memberships")
    .select("id")
    .eq("contributor_id", contributorId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (existingForGroup) {
    // Membership already exists for this group: update collector and start date (no duplicate insert)
    const updateData: Record<string, unknown> = { collector_id: collectorId };
    if (startDate) {
      updateData.created_at = startDate;
    }
    const { error: updateMembershipError } = await supabase
      .from("group_memberships")
      .update(updateData)
      .eq("id", existingForGroup.id);

    if (updateMembershipError) return { error: updateMembershipError.message };
  } else {
    // Check if the contributor had a previous requested membership for a different group
    const { data: otherMemberships } = await supabase
      .from("group_memberships")
      .select("id, group_id")
      .eq("contributor_id", contributorId);

    if (otherMemberships && otherMemberships.length === 1) {
      // Reassign the requested membership to the newly approved group
      const updateData: Record<string, unknown> = {
        group_id: groupId,
        collector_id: collectorId,
      };
      if (startDate) {
        updateData.created_at = startDate;
      }
      const { error: updateGroupError } = await supabase
        .from("group_memberships")
        .update(updateData)
        .eq("id", otherMemberships[0].id);

      if (updateGroupError) return { error: updateGroupError.message };
    } else {
      // Insert new membership
      const insertData: Record<string, unknown> = {
        contributor_id: contributorId,
        group_id: groupId,
        collector_id: collectorId,
      };
      if (startDate) {
        insertData.created_at = startDate;
      }
      
      const { error: groupError } = await supabase.from("group_memberships").insert(insertData);
      if (groupError) return { error: groupError.message };
    }
  }

  // 3. Mark any pending contributor_request notifications as read
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("type", "contributor_request")
      .filter("data->>contributor_id", "eq", contributorId);
  } catch {
    // Non-critical notification update
  }
  
  revalidatePath("/dashboard/admin/contributors");
  revalidatePath("/dashboard/collector/contributors");
  return { success: true };
}

export async function deleteEqubGroup(groupId: string) {
  try {
    const supabase = await createAdminClient();

    // 1. Delete associated contributions
    await supabase.from("contributions").delete().eq("group_id", groupId);

    // 2. Delete associated group memberships
    await supabase.from("group_memberships").delete().eq("group_id", groupId);

    // 3. Delete the group itself
    const { error } = await supabase.from("equb_groups").delete().eq("id", groupId);

    if (error) return { error: error.message, success: false };

    revalidatePath("/dashboard/collector/groups");
    revalidatePath("/dashboard/admin/contributors");
    revalidatePath("/dashboard/contributor/teqemachs");

    return { success: true, error: null };
  } catch (err: any) {
    return { error: err.message, success: false };
  }
}
