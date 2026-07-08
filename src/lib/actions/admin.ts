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
    email_confirm: false, // Require email verification
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
  const supabase = await createClient();

  const [collectorsRes, equbsRes, contributionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "collector"),
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
  const supabase = await createClient();
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
    .eq("role", "collector")
    .order("full_name", { ascending: true });
  if (error) return { error: error.message, data: [] };
  return { data: (data as any[]) ?? [], error: null };
}

export async function getFinancialReport(fromDate?: string, toDate?: string) {
  const supabase = await createClient();
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
