"use client";

import { useEffect } from "react";
import Script from "next/script";

export function TelegramProvider() {
  useEffect(() => {
    // Ensure this only runs on the client and when Telegram WebApp is available
    if (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;

      // 1. Initialize the app
      tg.ready();

      // 2. Expand to maximum height
      tg.expand();

      // 3. Enable closing confirmation (user is prompted before closing)
      // Only supported in Web App SDK 6.2+
      if (tg.isVersionAtLeast && tg.isVersionAtLeast("6.2")) {
        tg.enableClosingConfirmation();
      }

      // 4. Disable vertical swipes to completely prevent accidental swipe-to-close
      // Only supported in Web App SDK 7.7+
      if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7") && tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
    }
  }, []);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="beforeInteractive"
    />
  );
}
