import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyInitData, parseInitData } from "@/lib/telegram/verify";
import { getUserByTelegramId, getProfilesByTelegramId } from "@/lib/actions/telegram";
import { createCustomSession, getCustomSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { syncTelegramUserActiveProfile } from "@/lib/telegram-bot";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { initData, action = "login", role, email, password, profileId, collectorId, groupId, phone } = body;

    if (!initData) {
      return NextResponse.json({ error: "No initData provided" }, { status: 400 });
    }

    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
    if (!botToken) {
      console.error("[mini-app-auth] Missing TELEGRAM_BOT_TOKEN environment variable");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Verify cryptographic integrity
    const isValid = verifyInitData(initData, botToken);
    if (!isValid) {
      console.warn("[mini-app-auth] Failed to verify initData signature");
      return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
    }

    // Extract user info
    const initDataObj = parseInitData(initData);
    if (!initDataObj || !initDataObj.id) {
      return NextResponse.json({ error: "No user found in initData" }, { status: 400 });
    }

    const telegramId = initDataObj.id;
    const adminClient = await createAdminClient();

    // Get ALL profiles for this telegram user
    const profiles = await getProfilesByTelegramId(telegramId);

    // ─── LOGIN ──────────────────────────────────────────────────────────
    if (action === "login") {
      const cookieStore = await cookies();
      if (cookieStore.get("teqemach_explicit_logout")?.value === "true") {
        return NextResponse.json({ linked: false, explicitLogout: true });
      }
      
      // If user is already logged in with an active session, preserve it!
      const existingSession = await getCustomSession();
      if (existingSession && existingSession.role) {
        return NextResponse.json({
          linked: true,
          redirect: `/dashboard/${existingSession.role}`,
        });
      }

      // Check if user has a verified phone number in telegram_users
      const { data: tgUser } = await adminClient
        .from("telegram_users")
        .select("phone_number")
        .eq("telegram_id", telegramId)
        .single();

      const hasPhone = !!(tgUser?.phone_number);

      // Filter profiles strictly for contributor role (Mini App is 100% Contributor focused)
      const contributorProfile = profiles.find((p) => p.role === "contributor");

      if (!contributorProfile) {
        // Telegram user has no contributor profile yet -> start Contributor registration
        if (!hasPhone) {
          return NextResponse.json({ linked: false, needsPhone: true, telegramUser: initDataObj });
        }
        return NextResponse.json({ linked: false, telegramUser: initDataObj });
      }

      // If user has a contributor profile, auto-login directly regardless of collector profiles
      await createCustomSession({
        userId: contributorProfile.id,
        role: "contributor",
        email: contributorProfile.email || "",
      });

      await syncTelegramUserActiveProfile(telegramId, contributorProfile.id, "contributor", initDataObj);

      return NextResponse.json({
        linked: true,
        redirect: "/dashboard/contributor",
      });
    }

    // ─── SELECT ROLE (multi-role login) ─────────────────────────────────
    if (action === "select_role") {
      if (!profileId) {
        return NextResponse.json({ error: "No profile selected" }, { status: 400 });
      }

      // Verify the profile belongs to this telegram user
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) {
        return NextResponse.json({ error: "Profile not found for this Telegram account" }, { status: 404 });
      }

      if (profile.role === "admin") {
        return NextResponse.json({ error: "Admin accounts require password authentication." }, { status: 400 });
      }

      await createCustomSession({
        userId: profile.id,
        role: profile.role as "collector" | "contributor",
        email: profile.email || "",
      });

      await syncTelegramUserActiveProfile(telegramId, profile.id, profile.role, initDataObj);

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/${profile.role}`,
      });
    }

    // ─── REGISTER (collector — instant) ─────────────────────────────────
    if (action === "register") {
      if (!role || !["collector", "contributor"].includes(role)) {
        return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
      }

      // Check if user already has a profile with this role
      const existingWithRole = profiles.find((p) => p.role === role);
      if (existingWithRole) {
        return NextResponse.json(
          { error: `You already have a ${role} account.` },
          { status: 400 }
        );
      }

      // For contributor registration, use the register_contributor action instead
      if (role === "contributor") {
        return NextResponse.json(
          { error: "Use the contributor registration flow to select a collector and group." },
          { status: 400 }
        );
      }

      // Look up verified phone from telegram_users
      const { data: tgUserForReg } = await adminClient
        .from("telegram_users")
        .select("phone_number")
        .eq("telegram_id", telegramId)
        .single();
      const verifiedPhone = tgUserForReg?.phone_number || "";

      // Collector registration — instant, no password
      const fullName = [initDataObj.first_name, initDataObj.last_name].filter(Boolean).join(" ");
      const username = initDataObj.username || null;

      const { data: newProfile, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          phone_number: verifiedPhone,
          role: "collector",
          status: "active",
          telegram_id: telegramId,
          telegram_chat_id: telegramId,
          telegram_username: username,
          telegram_verified: true,
          telegram_linked_at: new Date().toISOString(),
          telegram_last_seen: new Date().toISOString(),
        })
        .select("id, role, email")
        .single();

      if (insertError || !newProfile) {
        console.error("Failed to create profile:", insertError);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
      }

      await createCustomSession({
        userId: newProfile.id,
        role: "collector",
        email: newProfile.email || "",
      });

      await syncTelegramUserActiveProfile(telegramId, newProfile.id, "collector", initDataObj);

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/collector`,
      });
    }

    // ─── REGISTER CONTRIBUTOR (without requiring group selection) ───────────
    if (action === "register_contributor") {
      // Check if user already has a contributor profile
      const existingContributor = profiles.find((p) => p.role === "contributor");
      if (existingContributor) {
        return NextResponse.json(
          { error: "You already have a contributor account." },
          { status: 400 }
        );
      }

      const fullName = [initDataObj.first_name, initDataObj.last_name].filter(Boolean).join(" ");
      const username = initDataObj.username || null;

      // Look up verified phone from telegram_users
      const { data: tgUserForContrib } = await adminClient
        .from("telegram_users")
        .select("phone_number")
        .eq("telegram_id", telegramId)
        .single();
      const contributorPhone = tgUserForContrib?.phone_number || "";

      const { data: newProfile, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          phone_number: contributorPhone,
          role: "contributor",
          status: "pending",
          telegram_id: telegramId,
          telegram_chat_id: telegramId,
          telegram_username: username,
          telegram_verified: true,
          telegram_linked_at: new Date().toISOString(),
          telegram_last_seen: new Date().toISOString(),
        })
        .select("id, role, email")
        .single();

      if (insertError || !newProfile) {
        console.error("Failed to create contributor profile:", insertError);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
      }

      // Auto-login as contributor
      await createCustomSession({
        userId: newProfile.id,
        role: "contributor",
        email: newProfile.email || "",
      });

      await syncTelegramUserActiveProfile(telegramId, newProfile.id, "contributor", initDataObj);

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/contributor`,
      });
    }

    // ─── GET EQUB GROUPS (for contributor registration flow) ──────────────
    if (action === "get_collectors" || action === "get_all_groups") {
      const { data: groups, error: groupError } = await adminClient
        .from("equb_groups")
        .select("id, name, contribution_amount, total_days, frequency, collector_id");

      if (groupError) {
        return NextResponse.json({ error: groupError.message }, { status: 500 });
      }

      return NextResponse.json({ data: groups || [] });
    }

    // ─── LINK (existing account) ────────────────────────────────────────
    if (action === "link") {
      if (profiles.length > 0) {
        return NextResponse.json(
          { error: "Telegram account is already linked to a Teqemach account." },
          { status: 400 }
        );
      }
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required to link account." },
          { status: 400 }
        );
      }

      // Dynamic import bcrypt only when needed (link action)
      const bcrypt = (await import("bcryptjs")).default;

      // Verify email & password
      const { data: existingProfile, error: profileError } = await adminClient
        .from("profiles")
        .select("id, role, password, email, status")
        .eq("email", email)
        .in("role", ["collector", "contributor"])
        .single();

      if (profileError || !existingProfile) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      if (!existingProfile.password) {
        return NextResponse.json(
          { error: "Account has no password configured. Contact admin." },
          { status: 400 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, existingProfile.password);
      if (!passwordMatch) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      // Link telegram id
      const username = initDataObj.username || null;
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          telegram_id: telegramId,
          telegram_chat_id: telegramId,
          telegram_username: username,
          telegram_verified: true,
          telegram_linked_at: new Date().toISOString(),
          telegram_last_seen: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Failed to link profile:", updateError);
        return NextResponse.json({ error: "Failed to link account" }, { status: 500 });
      }

      // Login
      await createCustomSession({
        userId: existingProfile.id,
        role: existingProfile.role as "collector" | "contributor",
        email: existingProfile.email || "",
      });

      await syncTelegramUserActiveProfile(telegramId, existingProfile.id, existingProfile.role, initDataObj);

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/${existingProfile.role}`,
      });
    }

    // ─── CHECK PHONE (polling from Mini App) ────────────────────────────
    if (action === "check_phone") {
      const { data: tgUserCheck } = await adminClient
        .from("telegram_users")
        .select("phone_number")
        .eq("telegram_id", telegramId)
        .single();

      return NextResponse.json({
        hasPhone: !!(tgUserCheck?.phone_number),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Mini App Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
