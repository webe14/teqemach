"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, HelpCircle, Info, User as UserIcon } from "lucide-react";
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
    admin: "text-violet-600 dark:text-violet-400",
    collector: "text-indigo-600 dark:text-indigo-400",
    contributor: "text-blue-600 dark:text-blue-400",
  };

  const activeBg = {
    admin: "bg-violet-100 dark:bg-violet-500/20 shadow-inner shadow-violet-500/10",
    collector: "bg-indigo-100 dark:bg-indigo-500/20 shadow-inner shadow-indigo-500/10",
    contributor: "bg-blue-100 dark:bg-blue-500/20 shadow-inner shadow-blue-500/10",
  };

  return (
    <>
      {/* Spacer to prevent content from hiding behind the bottom nav */}
      <div className="h-24 lg:hidden" />

      {/* Fixed Bottom Navigation Bar - Glassmorphism style */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-2xl border-t border-border/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] pb-safe rounded-t-[2.5rem] transition-all duration-300">
        <div className="flex items-center justify-around h-[80px] px-2 relative">
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
                    "absolute top-1.5 w-1.5 h-1.5 rounded-full animate-in fade-in zoom-in duration-300",
                    roleColors[role].replace('text-', 'bg-')
                  )} />
                )}
                
                <div
                  className={cn(
                    "flex flex-col items-center justify-center w-14 h-11 rounded-2xl transition-all duration-300 ease-out",
                    isActive ? activeBg[role] : "transparent group-hover:bg-muted/50",
                    isActive ? "-translate-y-1.5 scale-105" : "mt-1"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-300 ease-out",
                      isActive ? roleColors[role] : "text-muted-foreground",
                      isActive && "scale-110 drop-shadow-sm"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-wide truncate max-w-[70px] transition-all duration-300 ease-out",
                    isActive ? roleColors[role] : "text-muted-foreground",
                    isActive ? "-translate-y-1 opacity-100" : "opacity-80"
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
            <div className="flex flex-col items-center justify-center w-14 h-11 rounded-2xl transition-all duration-300 ease-out mt-1 transparent group-hover:bg-muted/50">
              <Menu className="h-[22px] w-[22px] text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className="text-[10px] font-semibold tracking-wide text-muted-foreground opacity-80 truncate max-w-[70px] transition-all duration-300 group-hover:opacity-100">
              {t("more")}
            </span>
          </button>
        </div>
      </nav>

      {/* More Bottom Sheet */}
      <Sheet open={openMore} onOpenChange={setOpenMore}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] max-h-[85vh] p-0 overflow-hidden flex flex-col border-t border-border shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-border bg-muted/20 backdrop-blur-xl">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-5" />
            <SheetHeader className="text-left px-2">
              <SheetTitle className="text-xl">Menu</SheetTitle>
              {userName && (
                <p className="text-sm text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{userName}</span></p>
              )}
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            {/* Overflow Nav Items */}
            {overflowItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
                  {t("navigation")}
                </h4>
                {overflowItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenMore(false)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-sm font-semibold group"
                  >
                    <div className="bg-background border border-border/50 p-2 rounded-xl group-hover:shadow-sm transition-all">
                      <item.icon className="h-[18px] w-[18px] text-foreground" />
                    </div>
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}

            {/* Admin Extra Links */}
            {role === "admin" && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
                  {t("administration")}
                </h4>
                <Link href="/dashboard/admin/management" onClick={() => setOpenMore(false)} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-sm font-semibold group">
                  <div className="bg-background border border-border/50 p-2 rounded-xl group-hover:shadow-sm transition-all">
                    <UserIcon className="h-[18px] w-[18px] text-foreground" />
                  </div>
                  {t("manageUsers")}
                </Link>
              </div>
            )}

            {/* General Links */}
            <div className="space-y-2 flex flex-col">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
                {t("accountAndApp")}
              </h4>
              <EditProfileModal 
                userName={userName ?? ""} 
                role={role} 
                className="w-full justify-start px-4 py-3.5 h-auto text-sm font-semibold text-foreground hover:bg-muted/60 active:scale-[0.98] rounded-2xl transition-all [&>svg]:mr-4 [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:p-1.5 [&>svg]:box-content [&>svg]:bg-background [&>svg]:border [&>svg]:border-border/50 [&>svg]:rounded-xl"
              />
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-sm font-semibold cursor-pointer group">
                <div className="bg-background border border-border/50 p-2 rounded-xl group-hover:shadow-sm transition-all">
                  <HelpCircle className="h-[18px] w-[18px] text-foreground" />
                </div>
                {t("help")}
              </div>
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-sm font-semibold cursor-pointer group">
                <div className="bg-background border border-border/50 p-2 rounded-xl group-hover:shadow-sm transition-all">
                  <Info className="h-[18px] w-[18px] text-foreground" />
                </div>
                {t("aboutTeqemach")}
              </div>
            </div>

            <div className="pt-6 pb-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => signOut()}
                className="w-full h-12 justify-center text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-bold active:scale-[0.98] transition-all"
              >
                <LogOut className="h-5 w-5 mr-2" />
                {t("logout")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
