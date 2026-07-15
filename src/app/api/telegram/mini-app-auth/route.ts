import { NextResponse } from "next/server";
import { verifyInitData, parseInitData } from "@/lib/telegram/verify";
import { getUserByTelegramId } from "@/lib/actions/telegram";
import { createCustomSession } from "@/lib/session";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { initData } = await req.json();

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
    const profile = await getUserByTelegramId(telegramId);

    if (!profile) {
      // User is verified by Telegram but not linked to any Teqemach account
      return NextResponse.json({ linked: false, telegramUser: initDataObj });
    }

    // User is linked, log them in
    if (profile.role === "admin") {
      // Admins should still use standard login for security, but we could issue a session here
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

  } catch (error) {
    console.error("Mini App Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
