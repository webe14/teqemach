import { NextResponse } from "next/server";
import { verifyInitData, parseInitData } from "@/lib/telegram/verify";
import { getUserByTelegramId, getProfilesByTelegramId } from "@/lib/actions/telegram";
import { createCustomSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { initData, action = "login", role, email, password, profileId, collectorId, groupId, phone } = body;

    if (!initData) {
      return NextResponse.json({ error: "No initData provided" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Verify cryptographic integrity
    const isValid = verifyInitData(initData, botToken);
    if (!isValid) {
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
      if (profiles.length === 0) {
        // Telegram verified but not linked to any Teqemach account
        return NextResponse.json({ linked: false, telegramUser: initDataObj });
      }

      // Filter out admin profiles (they need password auth)
      const nonAdminProfiles = profiles.filter((p) => p.role !== "admin");

      if (nonAdminProfiles.length === 0) {
        return NextResponse.json({
          linked: true,
          message: "Admin accounts require password authentication.",
          redirect: "/login",
        });
      }

      if (nonAdminProfiles.length === 1) {
        // Single role — auto login
        const profile = nonAdminProfiles[0];
        await createCustomSession({
          userId: profile.id,
          role: profile.role as "collector" | "contributor",
          email: profile.email || "",
        });
        return NextResponse.json({
          linked: true,
          redirect: `/dashboard/${profile.role}`,
        });
      }

      // Multiple roles — return role list for picker
      const roleList = nonAdminProfiles.map((p) => ({
        id: p.id,
        role: p.role,
        full_name: p.full_name,
        status: p.status,
      }));

      // Determine which roles the user can still register for
      const existingRoles = nonAdminProfiles.map((p) => p.role);
      const availableNewRoles = (["collector", "contributor"] as const).filter(
        (r) => !existingRoles.includes(r)
      );

      return NextResponse.json({
        linked: true,
        multiRole: true,
        roles: roleList,
        availableNewRoles,
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

      // Collector registration — instant, no password
      const fullName = [initDataObj.first_name, initDataObj.last_name].filter(Boolean).join(" ");
      const username = initDataObj.username || null;

      const { data: newProfile, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          phone_number: "",
          role: "collector",
          status: "active",
          telegram_id: telegramId,
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

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/collector`,
      });
    }

    // ─── REGISTER CONTRIBUTOR (with collector/group selection) ───────────
    if (action === "register_contributor") {
      // Check if user already has a contributor profile
      const existingContributor = profiles.find((p) => p.role === "contributor");
      if (existingContributor) {
        return NextResponse.json(
          { error: "You already have a contributor account." },
          { status: 400 }
        );
      }

      if (!collectorId || !groupId) {
        return NextResponse.json(
          { error: "Please select a collector and group." },
          { status: 400 }
        );
      }

      // Block collector from joining their own group
      const collectorProfile = profiles.find((p) => p.role === "collector");
      if (collectorProfile && collectorProfile.id === collectorId) {
        return NextResponse.json(
          { error: "You cannot join your own group as a contributor." },
          { status: 400 }
        );
      }

      // Verify the group belongs to the selected collector
      const { data: group, error: groupError } = await adminClient
        .from("equb_groups")
        .select("id, name, collector_id")
        .eq("id", groupId)
        .eq("collector_id", collectorId)
        .single();

      if (groupError || !group) {
        return NextResponse.json({ error: "Invalid group selection." }, { status: 400 });
      }

      const fullName = [initDataObj.first_name, initDataObj.last_name].filter(Boolean).join(" ");
      const username = initDataObj.username || null;

      const { data: newProfile, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          phone_number: phone || "",
          role: "contributor",
          status: "pending",
          collector_id: collectorId,
          telegram_id: telegramId,
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

      // Create group membership
      await adminClient.from("group_memberships").insert({
        contributor_id: newProfile.id,
        group_id: groupId,
        collector_id: collectorId,
      });

      // Notify the collector
      await adminClient.from("notifications").insert({
        user_id: collectorId,
        type: "contributor_request",
        title: "New Contributor Request",
        message: `${fullName} wants to join ${group.name}.`,
        data: {
          contributor_id: newProfile.id,
          contributor_name: fullName,
          group_id: groupId,
          group_name: group.name,
        },
      });

      // Auto-login as contributor
      await createCustomSession({
        userId: newProfile.id,
        role: "contributor",
        email: newProfile.email || "",
      });

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/contributor`,
      });
    }

    // ─── GET COLLECTORS (for contributor registration flow) ──────────────
    if (action === "get_collectors") {
      // Get current user's collector profile id (if any) to exclude it
      const collectorProfile = profiles.find((p) => p.role === "collector");
      const excludeId = collectorProfile?.id || null;

      // Fetch all collectors
      const { data: collectors, error: collectorError } = await adminClient
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "collector");

      if (collectorError) {
        return NextResponse.json({ error: collectorError.message }, { status: 500 });
      }

      // Filter out the user's own collector profile
      const filteredCollectors = excludeId
        ? (collectors || []).filter((c) => c.id !== excludeId)
        : collectors || [];

      // Fetch all equb groups
      const { data: groups, error: groupError } = await adminClient
        .from("equb_groups")
        .select("id, name, contribution_amount, total_days, frequency, collector_id");

      if (groupError) {
        return NextResponse.json({ error: groupError.message }, { status: 500 });
      }

      // Also filter out groups owned by the user's own collector profile
      const filteredGroups = excludeId
        ? (groups || []).filter((g) => g.collector_id !== excludeId)
        : groups || [];

      // Attach groups to each collector
      const collectorsWithGroups = filteredCollectors.map((collector) => ({
        ...collector,
        groups: filteredGroups.filter((g) => g.collector_id === collector.id),
      }));

      return NextResponse.json({ data: collectorsWithGroups });
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

      return NextResponse.json({
        linked: true,
        redirect: `/dashboard/${existingProfile.role}`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Mini App Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
