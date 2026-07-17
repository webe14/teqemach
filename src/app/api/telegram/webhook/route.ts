import { NextResponse } from "next/server";
import { TelegramUpdate } from "@/lib/telegram/types";
import { telegramBot } from "@/lib/telegram/telegram";
import { TelegramNotifier } from "@/lib/telegram/notifier";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // Verify the webhook secret token
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (configuredSecret && secretToken !== configuredSecret) {
      console.error("[Webhook] Unauthorized: secret mismatch", { received: secretToken, expected: configuredSecret });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update: TelegramUpdate = await req.json();
    console.log("[Webhook] Received update:", JSON.stringify(update).slice(0, 500));
    
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    const { text, chat, from } = update.message;
    const chatId = chat.id;
    const telegramId = from?.id;
    const username = from?.username;
    const firstName = from?.first_name;

    if (!telegramId) return NextResponse.json({ ok: true });

    // Update last seen (direct DB call, no server action)
    const supabase = await createAdminClient();
    await supabase
      .from("profiles")
      .update({ telegram_last_seen: new Date().toISOString() })
      .eq("telegram_id", telegramId);

    // Command handling
    if (text.startsWith("/")) {
      const parts = text.split(" ");
      const command = parts[0].toLowerCase().split("@")[0]; // Strip @botname suffix
      const payload = parts.slice(1).join(" ");

      console.log("[Webhook] Command:", command, "Payload:", payload);

      switch (command) {
        case "/start":
          await telegramBot.sendMessage(chatId, `👋 <b>Welcome to Teqemach Bot!</b>\n\nI am your companion bot for Teqemach.\nPlease open the Mini App to manage your account.`);
          break;
        case "/help":
          await telegramBot.sendMessage(chatId, "<b>Available Commands:</b>\n\n/start - Start the bot\n/help - Show this message\n\n<i>Note: Most functionality is available directly in the Teqemach Mini App.</i>");
          break;
        default:
          await telegramBot.sendMessage(chatId, "Unknown command. Type /help to see available commands.");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
