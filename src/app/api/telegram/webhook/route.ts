import { NextResponse } from "next/server";
import {
  sendTelegramMessage,
  openMiniAppButton,
  getTelegramUser,
  createTelegramUser,
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
      await handleMessage(body.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
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
