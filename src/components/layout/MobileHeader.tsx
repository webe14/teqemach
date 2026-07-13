"use client";

import { useState } from "react";
import { Menu, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NavLinks } from "./NavLinks";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { signOut } from "@/lib/actions/auth";
import { EditProfileModal } from "./EditProfileModal";
import { LogOut } from "lucide-react";

interface MobileHeaderProps {
  role: "admin" | "collector" | "contributor";
  pageName?: string;
  userName?: string;
  userId?: string;
}

export function MobileHeader({ role, pageName, userName, userId }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const roleGradients = {
    admin: "from-violet-600 to-indigo-600",
    collector: "from-indigo-600 to-blue-600",
    contributor: "from-blue-600 to-cyan-600",
  };

  return (
    <>
      {/* Sticky top header — mobile/tablet only */}
      <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-xl px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          id="mobile-menu-toggle"
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

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

      {/* Slide-out Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          {/* Drawer header */}
          <div className={`flex items-center gap-3 h-16 px-4 bg-gradient-to-r ${roleGradients[role]}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <div>
              <SheetTitle className="text-white text-sm font-bold">
                {t("appName")}
              </SheetTitle>
              <p className="text-white/70 text-xs capitalize">{role}</p>
            </div>
          </div>

          {/* Ethiopian line */}
          <div className="ethiopian-divider h-[2px] w-full" />

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto py-4">
            <NavLinks role={role} onNavigate={() => setOpen(false)} isMobile />
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-2">
            {userName && (
              <div className="px-3 py-2 rounded-xl bg-white/10">
                <p className="text-xs text-white/70">Signed in as</p>
                <p className="text-sm font-medium text-white truncate">{userName}</p>
              </div>
            )}
            <EditProfileModal userName={userName ?? ""} role={role} isMobile />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="w-full justify-start text-white hover:text-white hover:bg-destructive/40"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
