import { NextResponse } from "next/server";
import {
  sendTelegramMessage,
  openMiniAppButton,
  getTelegramUser,
  createTelegramUser,
  sendRequestContactButton,
  removeReplyKeyboard,
} from "@/lib/telegram-bot";
import { createAdminClient } from "@/lib/supabase/server";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_TELEGRAM_APP_URL || "https://teqemach.vercel.app";

export async function POST(req: Request) {
  try {
    // 1. Verify Webhook Secret
    if (WEBHOOK_SECRET) {
      const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
      if (secretToken !== WEBHOOK_SECRET) {
        console.warn("Unauthorized webhook request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();

    if (body.message) {
      // Handle contact sharing (phone number)
      if (body.message.contact) {
        await handleContact(body.message);
      } else {
        await handleMessage(body.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle incoming contact messages (from request_contact button).
 * Verifies the contact belongs to the sender, then saves the phone number.
 */
async function handleContact(message: any) {
  const chatId = message.chat?.id;
  const from = message.from;
  const contact = message.contact;

  if (!chatId || !from || !contact) return;

  // Verify the contact belongs to the user who sent it
  if (contact.user_id !== from.id) {
    await sendTelegramMessage(chatId, "❌ Please share your own phone number, not someone else's.");
    return;
  }

  const phoneNumber = contact.phone_number;
  if (!phoneNumber) {
    await sendTelegramMessage(chatId, "❌ No phone number found in the shared contact.");
    return;
  }

  const telegramId = from.id;
  const supabase = await createAdminClient();

  // Ensure telegram_users row exists
  let tgUser = await getTelegramUser(telegramId);
  if (!tgUser) {
    tgUser = await createTelegramUser({
      telegram_id: telegramId,
      username: from.username || null,
      first_name: from.first_name || null,
      last_name: from.last_name || null,
      language_code: from.language_code || null,
    });
  }

  // Save phone number to telegram_users
  await supabase
    .from("telegram_users")
    .update({ phone_number: phoneNumber })
    .eq("telegram_id", telegramId);

  // Also update phone_number on all linked profiles
  const { data: linkedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramId);

  if (linkedProfiles && linkedProfiles.length > 0) {
    const profileIds = linkedProfiles.map((p: any) => p.id);
    await supabase
      .from("profiles")
      .update({ phone_number: phoneNumber })
      .in("id", profileIds);
  }

  // Remove the reply keyboard (only needed if they used the fallback deep link)
  // and send a simple confirmation message. We don't send an inline keyboard
  // because the native WebApp.requestContact keeps them inside the Mini App.
  await removeReplyKeyboard(
    chatId,
    `✅ Phone number saved successfully!`
  );
}

async function handleMessage(message: any) {
  const chatId = message.chat?.id;
  const text = message.text || "";
  const from = message.from;

  if (!chatId || !from || !text.startsWith("/")) return;

  const command = text.split(" ")[0].toLowerCase();
  const telegramId = from.id;

  // Ensure user exists in telegram_users
  let tgUser = await getTelegramUser(telegramId);
  
  if (!tgUser) {
    tgUser = await createTelegramUser({
      telegram_id: telegramId,
      username: from.username || null,
      first_name: from.first_name || null,
      last_name: from.last_name || null,
      language_code: from.language_code || null,
    });
  }

  const supabase = await createAdminClient();

  switch (command) {
    case "/start": {
      const args = text.split(" ").slice(1);
      
      // Handle deep link: share_phone
      if (args.length > 0 && args[0] === "share_phone") {
        await sendRequestContactButton(
          chatId,
          "📱 Please tap the button below to share your verified phone number with Teqemach."
        );
        break;
      }

      // Handle deep link logic for linking accounts
      if (args.length > 0 && args[0].startsWith("link_")) {
        const profileIdToLink = args[0].replace("link_", "");
        
        // Lookup profile
        const { data: profileToLink } = await supabase
          .from("profiles")
          .select("id, telegram_username")
          .eq("id", profileIdToLink)
          .single();
          
        if (!profileToLink) {
          await sendTelegramMessage(chatId, "❌ Link invalid or expired. Profile not found.");
          break;
        }
        
        if (profileToLink.telegram_username?.toLowerCase() !== from.username?.toLowerCase()) {
          await sendTelegramMessage(chatId, `❌ Username mismatch! The collector linked this account to @${profileToLink.telegram_username}, but your Telegram username is @${from.username}. Please update your username or ask the collector to fix it.`);
          break;
        }
        
        await supabase.from("profiles").update({
          telegram_id: telegramId,
          telegram_chat_id: telegramId,
          telegram_verified: true,
          telegram_linked_at: new Date().toISOString(),
          status: "active",
        }).eq("id", profileIdToLink);
        
        // Also update telegram_users
        await supabase.from("telegram_users").update({
          user_id: profileIdToLink
        }).eq("telegram_id", telegramId);
        
        const successText = `✅ Account successfully linked!\n\nWelcome to Teqemach 👋\nManage your equb contributions easily. Click below to open the Mini App!`;
        const replyMarkup = {
          inline_keyboard: [
            [openMiniAppButton("Open Teqemach", APP_URL)]
          ]
        };
        await sendTelegramMessage(chatId, successText, { reply_markup: replyMarkup });
        break;
      }

      // Default start text
      const welcomeText = `Welcome to Teqemach 👋\n\nManage your equb contributions easily. Click below to open the Mini App!`;
      const replyMarkup = {
        inline_keyboard: [
          [openMiniAppButton("Open Teqemach", APP_URL)]
        ]
      };
      
      await sendTelegramMessage(chatId, welcomeText, { reply_markup: replyMarkup });
      break;
    }

    case "/help": {
      const helpText = `Here are the available commands:
/start - Launch the Mini App
/profile - View your profile status
/mycontribution - View your contribution metrics
/report - Get a brief overview
/help - Show this help message`;
      await sendTelegramMessage(chatId, helpText);
      break;
    }

    case "/profile": {
      let profileText = "You are not linked to a Teqemach account yet. Please /start and open the Mini App.";
      
      if (tgUser && tgUser.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role, status")
          .eq("id", tgUser.user_id)
          .single();

        if (profile) {
          profileText = `👤 **Your Profile**
Name: ${profile.full_name || tgUser.first_name || "Unknown"}
Role: ${profile.role}
Account status: ${profile.status}
Telegram connected: Yes`;
        }
      }
      
      await sendTelegramMessage(chatId, profileText, { parse_mode: "Markdown" });
      break;
    }

    case "/mycontribution": {
      if (!tgUser || !tgUser.user_id) {
        await sendTelegramMessage(chatId, "Please link your account first by opening the Mini App.");
        return;
      }
      
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", tgUser.user_id).single();
      
      if (profile?.role !== "contributor") {
        await sendTelegramMessage(chatId, "This command is only available for contributors.");
        return;
      }

      const { data: memberships } = await supabase
        .from("group_memberships")
        .select("total_contributed, group_id(name)")
        .eq("contributor_id", tgUser.user_id);
        
      if (!memberships || memberships.length === 0) {
        await sendTelegramMessage(chatId, "You are not part of any equb group yet.");
        return;
      }

      let contribText = `💰 **Your Contributions:**\n\n`;
      memberships.forEach((m: any) => {
        const groupName = m.group_id?.name || "Unknown Group";
        contribText += `- ${groupName}: ETB ${m.total_contributed || 0}\n`;
      });

      await sendTelegramMessage(chatId, contribText, { parse_mode: "Markdown" });
      break;
    }

    case "/report": {
      if (!tgUser || !tgUser.user_id) {
        await sendTelegramMessage(chatId, "Please link your account first by opening the Mini App.");
        return;
      }
      await sendTelegramMessage(chatId, "Your account is active and looking good! Open the Mini App for detailed reports.");
      break;
    }

    case "/stats": {
      if (!tgUser || !tgUser.user_id) {
        await sendTelegramMessage(chatId, "Unauthorized.");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", tgUser.user_id).single();
      
      if (profile?.role !== "admin") {
        await sendTelegramMessage(chatId, "Unauthorized. Admin access required.");
        return;
      }

      const { count: contributorCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("role", "contributor");
      const { count: collectorCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("role", "collector");
      
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", startOfDay.toISOString());
        
      const todaysTotal = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const statsText = `📊 **Platform Stats**
- Contributors: ${contributorCount || 0}
- Collectors: ${collectorCount || 0}
- Today's Contributions: ETB ${todaysTotal}`;

      await sendTelegramMessage(chatId, statsText, { parse_mode: "Markdown" });
      break;
    }

    default: {
      await sendTelegramMessage(chatId, "Unknown command. Send /help to see available commands.");
      break;
    }
  }
}
