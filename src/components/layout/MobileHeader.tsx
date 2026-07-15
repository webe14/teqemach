"use client";

import { Coins } from "lucide-react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface MobileHeaderProps {
  role: "admin" | "collector" | "contributor";
  pageName?: string;
  userName?: string;
  userId?: string;
}

export function MobileHeader({ role, pageName, userId }: MobileHeaderProps) {
  const { t } = useLocale();

  const roleGradients = {
    admin: "from-violet-600 to-indigo-600",
    collector: "from-indigo-600 to-blue-600",
    contributor: "from-blue-600 to-cyan-600",
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-xl px-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${roleGradients[role]} shrink-0`}
        >
          <Coins className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {pageName ?? t("appName")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {role === "collector" && userId && (
          <NotificationBell userId={userId} isMobile />
        )}
        <LanguageToggle />
      </div>
    </header>
  );
}
