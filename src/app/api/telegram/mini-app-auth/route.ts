import { NextResponse } from "next/server";
import { verifyInitData, parseInitData } from "@/lib/telegram/verify";
import { getUserByTelegramId } from "@/lib/actions/telegram";
import { createCustomSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { initData, action = "login", role, email, password } = body;

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

    // Check if user exists by telegramId
    const profile = await getUserByTelegramId(telegramId);

    if (action === "login") {
      if (!profile) {
        // User is verified by Telegram but not linked to any Teqemach account
        return NextResponse.json({ linked: false, telegramUser: initDataObj });
      }

      // User is linked, log them in
      if (profile.role === "admin") {
        return NextResponse.json({ 
          linked: true, 
          message: "Admin accounts require password authentication.",
          redirect: "/login" 
        });
      }

      // Create session for collector/contributor
      await createCustomSession({
        userId: profile.id,
        role: profile.role as "collector" | "contributor",
        email: profile.email || "",
      });

      return NextResponse.json({ 
        linked: true, 
        redirect: `/dashboard/${profile.role}` 
      });
    }

    if (action === "register") {
      if (profile) {
        return NextResponse.json({ error: "Telegram account already registered" }, { status: 400 });
      }
      if (!role || !["collector", "contributor"].includes(role)) {
        return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
      }

      const fullName = [initDataObj.first_name, initDataObj.last_name].filter(Boolean).join(" ");
      const username = initDataObj.username || null;

      const { data: newProfile, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          phone_number: "", // Could be updated later
          role: role,
          status: role === "contributor" ? "pending" : "active",
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

      // Automatically login
      await createCustomSession({
        userId: newProfile.id,
        role: newProfile.role as "collector" | "contributor",
        email: newProfile.email || "",
      });

      return NextResponse.json({ 
        linked: true, 
        redirect: `/dashboard/${newProfile.role}` 
      });
    }

    if (action === "link") {
      if (profile) {
        return NextResponse.json({ error: "Telegram account is already linked to a Teqemach account." }, { status: 400 });
      }
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required to link account." }, { status: 400 });
      }

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
        return NextResponse.json({ error: "Account has no password configured. Contact admin." }, { status: 400 });
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
        redirect: `/dashboard/${existingProfile.role}` 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Mini App Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
