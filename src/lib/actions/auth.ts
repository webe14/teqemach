"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createCustomSession, clearCustomSession, getCustomSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function signIn(formData: { email: string; password: string }) {
  const supabase = await createClient();

  // ── Step 1: Try Supabase Auth (admin path) ──────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (!authError && authData.user) {
    // Supabase Auth succeeded — this is the admin.
    // Ensure a profile row exists (in case it was created in Supabase dashboard
    // after the auto-trigger was removed).
    const adminClient = await createAdminClient();
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (!existingProfile) {
      // Auto-create admin profile row with the Supabase Auth user's UUID
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
        // Sign out the Supabase session so we don't leave a dangling session
        await supabase.auth.signOut();
        return { error: `Profile creation failed: ${insertError.message}` };
      }
    }

    return { success: true };
  }

  // ── Step 2: Custom profile-based auth (collector / contributor) ──────────
  const adminClient = await createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, password, email")
    .eq("email", formData.email)
    .in("role", ["collector", "contributor"])
    .single();

  if (profileError || !profile) {
    // Neither auth path worked
    return { error: "Invalid email or password" };
  }

  if (!profile.password) {
    return { error: "Account has no password configured. Contact admin." };
  }

  const passwordMatch = await bcrypt.compare(formData.password, profile.password);
  if (!passwordMatch) {
    return { error: "Invalid email or password" };
  }

  // Issue custom JWT cookie
  await createCustomSession({
    userId: profile.id,
    role: profile.role as "collector" | "contributor",
    email: profile.email ?? formData.email,
  });

  return { success: true, role: profile.role };
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
 *  - Admin   → resolved via Supabase Auth session
 *  - Collector/Contributor → resolved via custom JWT cookie
 */
export async function getCurrentProfile() {
  const supabase = await createClient();

  // Check Supabase Auth first (admin)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return data;
  }

  // Check custom session (collector / contributor)
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

