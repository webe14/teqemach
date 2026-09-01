"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Sparkles, 
  History as HistoryIcon, 
  BookOpen, 
  Menu, 
  LogOut, 
  HelpCircle, 
  Info, 
  User as UserIcon,
  Coins,
  ShieldCheck
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import {
  adminNavItems,
  collectorNavItems,
  contributorNavItems,
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
  isAdmin?: boolean;
}

export function MobileBottomNav({ role, userName, isAdmin }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [openMore, setOpenMore] = useState(false);

  const showAdminLink = role === "admin" || isAdmin;

  const allItems =
    role === "admin"
      ? adminNavItems
      : role === "collector"
      ? collectorNavItems
      : contributorNavItems;

  const leftItem = allItems[1];
  const centerItem = allItems[0];
  const overflowItems = allItems.slice(2);

  return (
    <>
      {/* ─── FLOATING CENTER BUTTON BOTTOM NAV BAR ────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 pb-safe pointer-events-none">
        {/* We use pointer-events-none on the wrapper so we can click through the transparent parts above the bar, 
            and pointer-events-auto on the actual background and buttons */}
        
        {/* Main Background Bar */}
        <div className="absolute bottom-0 w-full h-[70px] bg-brand-900 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-slate-800/60 pointer-events-auto rounded-t-3xl" />

        <div className="flex items-center justify-between h-[70px] px-2 max-w-md mx-auto relative pointer-events-auto">
          
          {/* Left Item (My Equb) */}
          <div className="flex flex-1 justify-center h-full">
            <Link
              href={leftItem.href}
              className="flex flex-col items-center justify-center w-16 h-full relative group transition-all"
            >
              <div className={cn("transition-all duration-200", pathname.startsWith(leftItem.href) ? "text-blue-400" : "text-slate-400 group-hover:text-slate-300")}>
                <leftItem.icon className={cn("h-6 w-6 mb-1", pathname.startsWith(leftItem.href) && "fill-blue-500/20")} />
              </div>
              <span className={cn("text-[10px] font-bold tracking-tight truncate max-w-full transition-colors duration-200", pathname.startsWith(leftItem.href) ? "text-blue-400" : "text-slate-400")}>
                {t(leftItem.labelKey)}
              </span>
            </Link>
          </div>

          {/* Center Space for Floating Button (Home) */}
          <div className="w-[80px] h-full flex justify-center relative">
            {/* The Cutout Illusion (Padding around the button) */}
            <div className="absolute -top-6 w-[72px] h-[72px] bg-background rounded-full flex items-center justify-center">
              {/* Floating Action Button */}
              <Link 
                href={centerItem.href}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95",
                  pathname === centerItem.href 
                    ? "bg-blue-600 shadow-blue-500/40 text-white" 
                    : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                )}
              >
                <centerItem.icon className={cn("w-6 h-6", pathname === centerItem.href && "fill-white/20")} />
              </Link>
            </div>
            
            {/* Label for center button */}
            <span className={cn(
              "absolute bottom-2 text-[10px] font-bold tracking-tight",
              pathname === centerItem.href ? "text-blue-400" : "text-slate-400"
            )}>
              {t(centerItem.labelKey) === "personalDashboard" ? "Home" : t(centerItem.labelKey) === "overview" ? "Home" : t(centerItem.labelKey)}
            </span>
          </div>

          {/* Right Item (Account Sheet Menu Button) */}
          <div className="flex flex-1 justify-center h-full">
            <button
              onClick={() => setOpenMore(true)}
              className="flex flex-col items-center justify-center w-16 h-full relative group transition-all"
            >
              <div className="transition-all duration-200 text-slate-400 group-hover:text-slate-300">
                <UserIcon className="h-6 w-6 mb-1" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-slate-400 truncate max-w-full">
                Account
              </span>
            </button>
          </div>

        </div>
      </nav>

      {/* ─── MORE MENU BOTTOM SHEET ───────────────────────────────────────── */}
      <Sheet open={openMore} onOpenChange={setOpenMore}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] max-h-[85vh] p-0 overflow-hidden flex flex-col border-t border-slate-800 bg-brand-900 text-slate-100 shadow-2xl">
          <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 ">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-5" />
            <SheetHeader className="text-left px-2">
              <SheetTitle className="text-xl text-white">Menu</SheetTitle>
              {userName && (
                <p className="text-xs text-slate-400">Signed in as <span className="font-semibold text-white">{userName}</span></p>
              )}
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Overflow Navigation Items */}
            {overflowItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
                  {t("navigation")}
                </h4>
                {overflowItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenMore(false)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:bg-slate-800 transition-all text-sm font-semibold text-slate-200"
                  >
                    <div className="bg-slate-800 p-2 rounded-xl text-blue-400">
                      <item.icon className="h-4 h-4" />
                    </div>
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}

            {/* General Actions & Profile */}
            <div className="space-y-2 flex flex-col">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
                {t("accountAndApp")}
              </h4>

              {/* Role Switcher for Admin-authorized users */}
              {showAdminLink && role !== "admin" && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setOpenMore(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-700/50 hover:bg-violet-900/60 transition-all text-sm font-semibold text-violet-200"
                >
                  <div className="bg-violet-900/80 p-2 rounded-xl text-violet-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  Switch to Admin Dashboard
                </Link>
              )}

              {showAdminLink && role === "admin" && (
                <Link
                  href="/dashboard/contributor"
                  onClick={() => setOpenMore(false)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border border-blue-700/50 hover:bg-blue-900/60 transition-all text-sm font-semibold text-blue-200"
                >
                  <div className="bg-blue-900/80 p-2 rounded-xl text-blue-300">
                    <Home className="h-4 w-4" />
                  </div>
                  Switch to Contributor View
                </Link>
              )}

              <EditProfileModal 
                userName={userName ?? ""} 
                role={role} 
                className="w-full justify-start px-4 py-3.5 h-auto text-sm font-semibold text-slate-200 bg-slate-900/50 border border-slate-800/60 hover:bg-slate-800 rounded-2xl transition-all [&>svg]:mr-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:p-1.5 [&>svg]:box-content [&>svg]:bg-slate-800 [&>svg]:rounded-xl [&>svg]:text-blue-400"
              />
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:bg-slate-800 transition-all text-sm font-semibold text-slate-200 cursor-pointer">
                <div className="bg-slate-800 p-2 rounded-xl text-blue-400">
                  <HelpCircle className="h-4 h-4" />
                </div>
                {t("help")}
              </div>
              <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:bg-slate-800 transition-all text-sm font-semibold text-slate-200 cursor-pointer">
                <div className="bg-slate-800 p-2 rounded-xl text-blue-400">
                  <Info className="h-4 h-4" />
                </div>
                {t("aboutTeqemach")}
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 pb-4 border-t border-slate-800/80">
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    localStorage.setItem("teqemach_explicit_logout", "true");
                  } catch {}
                  await signOut();
                }}
                className="w-full h-12 justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-2xl font-bold transition-all"
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
