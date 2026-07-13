"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createCustomSession, clearCustomSession, getCustomSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function signIn(formData: { email: string; password: string }) {
  const supabase = await createClient();

  // ── Step 1: Try Supabase Auth (admin, or newly registered users) ─────────
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (!authError && authData.user) {
    // Supabase Auth succeeded.
    // Ensure a profile row exists (for admins auto-created in dashboard)
    const adminClient = await createAdminClient();
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (!existingProfile) {
      // Look if there's a legacy profile with this email that we should link?
      // Since this is email/password, they wouldn't have a Supabase Auth user unless they were registered there.
      // We only auto-create for 'admin' to preserve legacy behavior.
      const { error: insertError } = await adminClient.from("profiles").insert({
        id: authData.user.id,
        full_name:
          authData.user.user_metadata?.full_name ??
          authData.user.user_metadata?.fullName ??
          authData.user.email ??
          "Admin",
        phone_number:
          authData.user.user_metadata?.phone_number ??
          authData.user.user_metadata?.phoneNumber ??
          "",
        role: "admin",
        email: authData.user.email ?? formData.email,
        password: "supabase_auth",
      });

      if (insertError) {
        await supabase.auth.signOut();
        return { error: `Profile creation failed: ${insertError.message}` };
      }
    }

    return { success: true };
  }

  // ── Step 2: Custom profile-based auth (legacy collector / contributor) ───
  const adminClient = await createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, password, email, status")
    .eq("email", formData.email)
    .in("role", ["collector", "contributor"])
    .single();

  if (profileError || !profile) {
    return { error: "Invalid email or password" };
  }

  if (!profile.password) {
    return { error: "Account has no password configured. Contact admin." };
  }

  const passwordMatch = await bcrypt.compare(formData.password, profile.password);
  if (!passwordMatch) {
    return { error: "Invalid email or password" };
  }

  // Block pending/rejected contributors
  if (profile.role === "contributor" && profile.status === "pending") {
    return { error: "Your account is pending approval from the collector. Please wait." };
  }
  if (profile.role === "contributor" && profile.status === "rejected") {
    return { error: "Your registration was rejected by the collector." };
  }

  // Issue custom JWT cookie
  await createCustomSession({
    userId: profile.id,
    role: profile.role as "collector" | "contributor",
    email: profile.email ?? formData.email,
  });

  return { success: true, role: profile.role };
}

export async function signInWithGoogle(options?: { role?: string; collectorId?: string; groupId?: string }) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  
  const params = new URLSearchParams();
  if (options?.role) params.set("role", options.role);
  if (options?.collectorId) params.set("collectorId", options.collectorId);
  if (options?.groupId) params.set("groupId", options.groupId);
  
  const redirectUrl = params.toString() ? `${origin}/auth/callback?${params.toString()}` : `${origin}/auth/callback`;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { url: data.url };
}

export async function getCollectors() {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "collector");

  if (error) {
    return { error: error.message };
  }
  return { data };
}

export async function signUp(formData: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "collector" | "contributor";
  collectorId?: string | null;
  groupId?: string | null;
}) {
  const adminClient = await createAdminClient();

  // Check if email already exists
  const { data: existingUser } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", formData.email)
    .maybeSingle();

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
  });

  if (authError) {
    return { error: authError.message };
  }

  // Hash the password for custom credential logins fallback
  const hashedPassword = await bcrypt.hash(formData.password, 10);

  // Contributors who self-register are set to 'pending' until approved by the collector
  const status = formData.role === "contributor" ? "pending" : "active";

  // Insert profile
  const { data: newProfile, error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: authData.user?.id,
      full_name: formData.fullName,
      email: formData.email,
      password: hashedPassword,
      phone_number: formData.phone,
      role: formData.role,
      status,
      collector_id: formData.collectorId || null,
    })
    .select("id, role, email")
    .single();

  if (insertError) {
    return { error: `Registration failed: ${insertError.message}` };
  }

  // For contributors: create group membership and notify the collector
  if (formData.role === "contributor" && formData.collectorId && formData.groupId && newProfile) {
    // Create group membership
    await adminClient.from("group_memberships").insert({
      contributor_id: newProfile.id,
      group_id: formData.groupId,
      collector_id: formData.collectorId,
    });

    // Fetch group name for the notification
    const { data: group } = await adminClient
      .from("equb_groups")
      .select("name")
      .eq("id", formData.groupId)
      .single();

    // Create notification for the collector
    await adminClient.from("notifications").insert({
      user_id: formData.collectorId,
      type: "contributor_request",
      title: "New Contributor Request",
      message: `${formData.fullName} wants to join ${group?.name ?? "your group"}.`,
      data: {
        contributor_id: newProfile.id,
        contributor_name: formData.fullName,
        contributor_email: formData.email,
        group_id: formData.groupId,
        group_name: group?.name ?? null,
      },
    });
  }

  return { success: true, user: newProfile };
}

export async function getCollectorsWithGroups() {
  const adminClient = await createAdminClient();

  // Fetch all collectors
  const { data: collectors, error: collectorError } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "collector");

  if (collectorError) return { error: collectorError.message, data: [] };

  // Fetch all equb groups
  const { data: groups, error: groupError } = await adminClient
    .from("equb_groups")
    .select("id, name, contribution_amount, total_days, frequency, collector_id");

  if (groupError) return { error: groupError.message, data: [] };

  // Attach groups to each collector
  const collectorsWithGroups = (collectors ?? []).map((collector) => ({
    ...collector,
    groups: (groups ?? []).filter((g) => g.collector_id === collector.id),
  }));

  console.log("DEBUG: groups", groups);
  console.log("DEBUG: collectorsWithGroups", JSON.stringify(collectorsWithGroups, null, 2));

  return { data: collectorsWithGroups, error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearCustomSession();
  redirect("/login");
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Returns the current user's profile regardless of auth method.
 *  - Supabase Auth users (admin, new users, Google OAuth)
 *  - Custom JWT cookie users (legacy collector/contributor)
 */
export async function getCurrentProfile() {
  const supabase = await createClient();

  // Check Supabase Auth first
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Try matching by ID first
    const { data: idData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      
    if (idData) return idData;

    // For Google OAuth users whose email exists in legacy profiles, link by email
    if (user.email) {
      const adminClient = await createAdminClient();
      const { data: emailData } = await adminClient
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .single();
      
      if (emailData) return emailData;
    }
  }

  // Check custom session (legacy collector / contributor)
  const customSession = await getCustomSession();
  if (customSession) {
    const adminClient = await createAdminClient();
    const { data } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", customSession.userId)
      .single();
    return data;
  }

  return null;
}

export async function getProfileById(id: string) {
  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name, phone_number, role, email")
    .eq("id", id)
    .single();
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

/**
 * Update the current user's full_name and/or password.
 * Works for both admin (Supabase Auth) and custom-session users.
 */
export async function updateProfile(data: {
  fullName?: string;
  newPassword?: string;
  currentPassword?: string;
}) {
  const adminClient = await createAdminClient();
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not authenticated" };

  const updates: Record<string, string> = {};

  // Update name
  if (data.fullName && data.fullName.trim()) {
    updates.full_name = data.fullName.trim();
  }

  // Update password (requires current password for non-admin)
  if (data.newPassword) {
    if (profile.role !== "admin") {
      // Verify current password for collector/contributor
      if (!data.currentPassword) {
        return { error: "Current password is required" };
      }
      const match = await bcrypt.compare(data.currentPassword, profile.password ?? "");
      if (!match) {
        return { error: "Current password is incorrect" };
      }
      const hashed = await bcrypt.hash(data.newPassword, 10);
      updates.password = hashed;
    } else {
      // For admin: update via Supabase Auth
      const supabase = await createClient();
      const { error: authErr } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (authErr) return { error: authErr.message };
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No changes provided" };
  }

  const { error } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", profile.id);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Specifically for newly invited users to set their initial password.
 * They are already authenticated via the invite link.
 */
export async function activateAccount(newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated. Invalid or expired invitation link." };
  }

  // 1. Update password in Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. Sync to legacy profiles table
  const adminClient = await createAdminClient();
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ password: hashedPassword })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  return { success: true };
}

