"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter, usePathname } from "next/navigation";

export function TelegramProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const [authInProgress, setAuthInProgress] = useState(false);

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

      // 5. Automatic Authentication via Mini App
      if (tg.initData && (pathname === "/" || pathname === "/login") && !authInProgress) {
        setAuthInProgress(true);
        fetch("/api/telegram/mini-app-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.linked && data.redirect) {
              router.push(data.redirect);
            }
          })
          .catch(console.error)
          .finally(() => setAuthInProgress(false));
      }
    }
  }, [pathname, router, authInProgress]);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="beforeInteractive"
    />
  );
}
