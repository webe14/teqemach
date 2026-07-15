"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Settings, HelpCircle, Info, User as UserIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import {
  adminNavItems,
  collectorNavItems,
  contributorNavItems,
  type NavItem,
} from "./NavLinks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EditProfileModal } from "./EditProfileModal";
import { signOut } from "@/lib/actions/auth";

interface MobileBottomNavProps {
  role: "admin" | "collector" | "contributor";
  userName?: string;
}

export function MobileBottomNav({ role, userName }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [openMore, setOpenMore] = useState(false);

  const allItems =
    role === "admin"
      ? adminNavItems
      : role === "collector"
      ? collectorNavItems
      : contributorNavItems;

  // Take up to 4 items for the bottom bar, put the rest in the More menu
  const bottomBarItems = allItems.slice(0, 4);
  const overflowItems = allItems.slice(4);

  const roleColors = {
    admin: "text-violet-600",
    collector: "text-indigo-600",
    contributor: "text-blue-600",
  };

  const activeBg = {
    admin: "bg-violet-100 dark:bg-violet-500/20",
    collector: "bg-indigo-100 dark:bg-indigo-500/20",
    contributor: "bg-blue-100 dark:bg-blue-500/20",
  };

  return (
    <>
      {/* Spacer to prevent content from hiding behind the bottom nav */}
      <div className="h-20 lg:hidden" />

      {/* Fixed Bottom Navigation Bar - Glassmorphism style */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.2)] pb-safe rounded-t-3xl transition-all duration-300">
        <div className="flex items-center justify-around h-[72px] px-2 relative">
          {bottomBarItems.map((item) => {
            const isActive =
              item.href === `/dashboard/${role}`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full gap-1 p-1 relative group"
              >
                {/* Active Indicator Dot */}
                {isActive && (
                  <span className={cn(
                    "absolute top-0 w-1 h-1 rounded-full animate-in fade-in zoom-in duration-300",
                    roleColors[role].replace('text-', 'bg-')
                  )} />
                )}
                
                <div
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-10 rounded-2xl transition-all duration-300 ease-out",
                    isActive ? activeBg[role] : "transparent group-hover:bg-muted/50",
                    isActive ? "-translate-y-1" : ""
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-all duration-300 ease-out",
                      isActive ? roleColors[role] : "text-muted-foreground",
                      isActive && "scale-[1.15]"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium truncate max-w-[64px] transition-all duration-300 ease-out",
                    isActive ? roleColors[role] : "text-muted-foreground",
                    isActive ? "-translate-y-0.5 opacity-100" : "opacity-80"
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setOpenMore(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 p-1 relative group"
          >
            <div className="flex flex-col items-center justify-center w-12 h-10 rounded-2xl transition-all duration-300 ease-out transparent group-hover:bg-muted/50">
              <Menu className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground opacity-80 truncate max-w-[64px] transition-all duration-300 group-hover:opacity-100">
              {t("more")}
            </span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet */}
      <Sheet open={openMore} onOpenChange={setOpenMore}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
            <SheetHeader className="text-left">
              <SheetTitle>Menu</SheetTitle>
              {userName && (
                <p className="text-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{userName}</span></p>
              )}
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Overflow Nav Items */}
            {overflowItems.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {t("navigation")}
                </h4>
                {overflowItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenMore(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}

            {/* Admin Extra Links */}
            {role === "admin" && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {t("administration")}
                </h4>
                <Link href="/dashboard/admin/management" onClick={() => setOpenMore(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  {t("manageUsers")}
                </Link>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium cursor-pointer text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  {t("systemSettings")}
                </div>
              </div>
            )}

            {/* General Links */}
            <div className="space-y-1 flex flex-col">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {t("accountAndApp")}
              </h4>
              <EditProfileModal 
                userName={userName ?? ""} 
                role={role} 
                className="w-full justify-start px-3 py-3 h-auto text-sm font-medium text-foreground hover:bg-muted hover:text-foreground rounded-xl [&>svg]:text-muted-foreground"
              />
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium cursor-pointer">
                <Settings className="h-4 w-4 text-muted-foreground" />
                {t("systemSettings")} {/* Using system settings instead of just settings for ease */}
              </div>
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium cursor-pointer">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                {t("help")}
              </div>
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium cursor-pointer">
                <Info className="h-4 w-4 text-muted-foreground" />
                {t("aboutTeqemach")}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => signOut()}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("logout")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
