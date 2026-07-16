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
  console.log("[handleStartCommand] chatId:", chatId, "telegramId:", telegramId, "token:", token ? token.slice(0, 8) + "..." : "none");
  
  if (token && token.trim().length > 0) {
    // Attempt to link account
    const supabase = await createAdminClient();
    
    // Find the valid token
    const { data, error } = await supabase
      .from("telegram_otps")
      .select("id, user_id, expires_at, used")
      .eq("otp_code", token.trim())
      .eq("purpose", "telegram_link")
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    console.log("[handleStartCommand] OTP lookup result:", { data, error: error?.message });

    if (error || !data) {
      await telegramBot.sendMessage(chatId, "❌ <b>Invalid or expired link token.</b>\nPlease request a new link from the Teqemach app.");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      await telegramBot.sendMessage(chatId, "❌ <b>This link has expired.</b>\nPlease request a new link from the Teqemach app.");
      return;
    }

    try {
      // Check if telegram account is already linked to another user
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_id", telegramId)
        .neq("id", data.user_id)
        .single();

      if (existingUser) {
        await telegramBot.sendMessage(chatId, "❌ <b>Linking Failed</b>\n\nThis Telegram account is already linked to another user.");
        return;
      }

      // Update profile directly (no server action)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          telegram_id: telegramId,
          telegram_chat_id: chatId,
          telegram_username: username || firstName || null,
          telegram_verified: true,
          telegram_linked_at: new Date().toISOString(),
          telegram_last_seen: new Date().toISOString(),
        })
        .eq("id", data.user_id);

      if (updateError) {
        console.error("[handleStartCommand] Profile update error:", updateError);
        await telegramBot.sendMessage(chatId, "❌ <b>Linking Failed</b>\n\nFailed to link Telegram account. Please try again.");
        return;
      }

      // Ensure notification prefs exist
      const { data: prefs } = await supabase
        .from("telegram_notification_prefs")
        .select("id")
        .eq("user_id", data.user_id)
        .single();

      if (!prefs) {
        await supabase.from("telegram_notification_prefs").insert({ user_id: data.user_id });
      }
      
      // Mark token as used
      await supabase
        .from("telegram_otps")
        .update({ used: true })
        .eq("id", data.id);

      const result = await telegramBot.sendMessage(chatId, `✅ <b>Account Linked Successfully!</b>\n\nWelcome ${firstName || username || 'to Teqemach'}, your Telegram account is now connected.\nYou will receive notifications here.`);
      console.log("[handleStartCommand] Success message result:", result);
    } catch (err: any) {
      console.error("[handleStartCommand] Error:", err);
      await telegramBot.sendMessage(chatId, `❌ <b>Linking Failed</b>\n\n${err.message}`);
    }
  } else {
    // Standard start (no token)
    await telegramBot.sendMessage(chatId, `👋 <b>Welcome to Teqemach Bot!</b>\n\nTo link your account, please use the <b>Connect Telegram</b> button in the Teqemach app settings.`);
  }
}
