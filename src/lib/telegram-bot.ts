import { createAdminClient } from "./supabase/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Base generic function to call Telegram API methods
 */
async function callTelegramApi(method: string, payload: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return null;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`Telegram API Error (${method}):`, data.description);
    }
    return data;
  } catch (error) {
    console.error(`Telegram API Fetch Error (${method}):`, error);
    return null;
  }
}

/**
 * Send a simple text message to a user
 */
export async function sendTelegramMessage(chatId: number, text: string, options: any = {}) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

/**
 * Send a message with an inline keyboard
 */
export async function sendTelegramInlineKeyboard(chatId: number, text: string, inlineKeyboard: any[][], options: any = {}) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
    ...options,
  });
}

/**
 * Helper to construct an Open Mini App button
 */
export function openMiniAppButton(text: string, url: string) {
  return {
    text,
    web_app: { url },
  };
}

/**
 * Database Functions
 */

export type TelegramUser = {
  id?: string;
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string | null;
  role?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getTelegramUser(telegramId: number) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is 'not found'
    console.error("Error fetching telegram user:", error);
  }
  return data;
}

export async function createTelegramUser(user: TelegramUser) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("telegram_users")
    .insert([user])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating telegram user:", error);
    return null;
  }
  return data;
}

export async function updateTelegramUser(telegramId: number, updates: Partial<TelegramUser>) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("telegram_users")
    .update(updates)
    .eq("telegram_id", telegramId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating telegram user:", error);
    return null;
  }
  return data;
}

/**
 * Upsert the user's active profile from the Mini App so the bot knows who they are currently logged in as.
 */
export async function syncTelegramUserActiveProfile(telegramId: number, profileId: string, role: string, tgData: any = {}) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from("telegram_users").upsert({
    telegram_id: telegramId,
    username: tgData.username || null,
    first_name: tgData.first_name || null,
    last_name: tgData.last_name || null,
    language_code: tgData.language_code || null,
    user_id: profileId,
    role: role,
    updated_at: new Date().toISOString()
  }, { onConflict: "telegram_id" });

  if (error) {
    console.error("Error syncing telegram active profile:", error);
  }
}

/**
 * Notification System: Send a notification to a specific Telegram User by DB telegram_id
 */
export async function notifyTelegramUser(telegramId: number, message: string) {
  // We assume the telegramId is the chat_id for private chats
  return sendTelegramMessage(telegramId, message);
}

/**
 * Send a ReplyKeyboardMarkup with a "Share Phone Number" button that triggers
 * Telegram's native contact-sharing flow (request_contact = true).
 */
export async function sendRequestContactButton(chatId: number, text: string) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      keyboard: [
        [{ text: "📱 Share Phone Number", request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

/**
 * Remove the custom ReplyKeyboard by sending a ReplyKeyboardRemove.
 */
export async function removeReplyKeyboard(chatId: number, text: string) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      remove_keyboard: true,
    },
  });
}
