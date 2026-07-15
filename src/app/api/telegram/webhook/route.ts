import { NextResponse } from "next/server";
import { TelegramUpdate } from "@/lib/telegram/types";
import { telegramBot, TelegramNotifier } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/server";
import { linkTelegramAccount, updateTelegramLastSeen } from "@/lib/actions/telegram";

export async function POST(req: Request) {
  try {
    // Basic verification - in production, you should use the X-Telegram-Bot-Api-Secret-Token header
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (configuredSecret && secretToken !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update: TelegramUpdate = await req.json();
    
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    const { text, chat, from } = update.message;
    const chatId = chat.id;
    const telegramId = from?.id;
    const username = from?.username;
    const firstName = from?.first_name;

    if (!telegramId) return NextResponse.json({ ok: true });

    // Update last seen
    await updateTelegramLastSeen(telegramId).catch(() => {});

    // Command handling
    if (text.startsWith("/")) {
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();
      const payload = parts.slice(1).join(" ");

      switch (command) {
        case "/start":
          await handleStartCommand(chatId, telegramId, username, firstName, payload);
          break;
        case "/help":
          await telegramBot.sendMessage(chatId, "<b>Available Commands:</b>\n\n/start - Start the bot\n/help - Show this message\n/profile - View your profile info\n/today - Check today's contribution status\n/report - View summary report\n/settings - Manage notification preferences");
          break;
        case "/profile":
        case "/today":
        case "/report":
        case "/settings":
          await telegramBot.sendMessage(chatId, "<i>This command is coming soon! Open the Mini App to manage your account.</i>");
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

async function handleStartCommand(chatId: number, telegramId: number, username?: string, firstName?: string, token?: string) {
  if (token) {
    // Attempt to link account
    const supabase = await createAdminClient();
    
    // Find the valid token
    const { data, error } = await supabase
      .from("telegram_otps")
      .select("id, user_id, expires_at, used")
      .eq("otp_code", token)
      .eq("purpose", "telegram_link")
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data || new Date(data.expires_at) < new Date()) {
      await telegramBot.sendMessage(chatId, "❌ <b>Invalid or expired link token.</b>\nPlease request a new link from the Teqemach app.");
      return;
    }

    try {
      await linkTelegramAccount(data.user_id, telegramId, chatId, username, firstName);
      
      // Mark token as used
      await supabase
        .from("telegram_otps")
        .update({ used: true })
        .eq("id", data.id);

      await telegramBot.sendMessage(chatId, `✅ <b>Account Linked Successfully!</b>\n\nWelcome ${firstName || username || 'to Teqemach'}, your Telegram account is now connected.\nYou will receive notifications here.`);
    } catch (err: any) {
      await telegramBot.sendMessage(chatId, `❌ <b>Linking Failed</b>\n\n${err.message}`);
    }
  } else {
    // Standard start
    await telegramBot.sendMessage(chatId, `👋 <b>Welcome to Teqemach Bot!</b>\n\nTo link your account, please use the <b>Connect Telegram</b> button in the Teqemach app settings.`);
  }
}
