export class TelegramBotAPI {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || "";
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  private async request(method: string, data: any, retries = 3): Promise<any> {
    if (!this.token) {
      console.warn(`[TelegramBotAPI] Bot token not configured. Skipping ${method}.`);
      return null;
    }

    let attempt = 0;
    while (attempt < retries) {
      try {
        const response = await fetch(`${this.baseUrl}/${method}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = result.parameters?.retry_after || 5;
            console.warn(`[TelegramBotAPI] Rate limited (429). Retrying after ${retryAfter}s...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
            attempt++;
            continue;
          }
          console.error(`[TelegramBotAPI] Error in ${method}:`, result.description);
          return null;
        }

        return result.result;
      } catch (error) {
        console.error(`[TelegramBotAPI] Network error in ${method}:`, error);
        attempt++;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
        }
      }
    }
    return null;
  }

  async sendMessage(chatId: number | string, text: string, options: any = {}): Promise<any> {
    return this.request("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || "HTML",
      ...options,
    });
  }
}

export const telegramBot = new TelegramBotAPI();
