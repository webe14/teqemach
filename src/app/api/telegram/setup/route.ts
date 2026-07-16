import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://teqemach.vercel.app";

  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  try {
    // Register the webhook with Telegram
    const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret || undefined,
        allowed_updates: ["message"],
      }),
    });
    const setResult = await setRes.json();

    // Get webhook info for verification
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const infoResult = await infoRes.json();

    // Get bot info
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meResult = await meRes.json();

    return NextResponse.json({
      setWebhook: setResult,
      webhookInfo: infoResult,
      botInfo: meResult,
      registeredUrl: webhookUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
