"use client";

import { cn } from "@/lib/utils";
import { NavLinks } from "./NavLinks";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { signOut } from "@/lib/actions/auth";
import { EditProfileModal } from "./EditProfileModal";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Coins,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "collector" | "contributor";
  userName?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ role, userName, collapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useLocale();

  const roleColors = {
    admin: "from-violet-600 via-indigo-600 to-indigo-700 shadow-violet-500/20",
    collector: "from-indigo-600 via-blue-600 to-blue-700 shadow-indigo-500/20",
    contributor: "from-blue-600 via-cyan-600 to-cyan-700 shadow-blue-500/20",
  };

  const roleBadges = {
    admin: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-100/60 dark:border-violet-900/30",
    collector: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100/60 dark:border-indigo-900/30",
    contributor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100/60 dark:border-blue-900/30",
  };

  const roleLabels = {
    admin: t("admin"),
    collector: t("collector"),
    contributor: t("contributor"),
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-card border-r border-border/80 sidebar-transition fixed top-0 left-0 z-30 shadow-sm shadow-black/[0.02]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Section */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-border/80 px-4 shrink-0 justify-between",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl bg-gradient-to-br h-9 w-9 shrink-0 shadow-md transition-all duration-300 group-hover:scale-105",
              roleColors[role]
            )}
          >
            <Coins className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-foreground tracking-tight truncate">
                {t("appName")}
              </span>
              <span className={cn(
                "text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border mt-0.5 w-fit",
                roleBadges[role]
              )}>
                {roleLabels[role]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ethiopian decorative animated line */}
      <div className="ethiopian-divider h-[3px] w-full shrink-0" />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <NavLinks role={role} collapsed={collapsed} />
      </div>

      {/* User Session card + Sidebar Toggle */}
      <div className="border-t border-border/80 p-4 space-y-4 shrink-0 bg-muted/10">
        {!collapsed && userName ? (
          /* Expanded user card */
          <div className="rounded-2xl bg-muted/40 dark:bg-slate-900/20 border border-border/60 p-3 space-y-3 transition-all duration-300 hover:bg-muted/60">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/10 shrink-0">
                {(userName ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Active Session
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
              <EditProfileModal
                userName={userName ?? ""}
                role={role}
                collapsed={false}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-xs h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-1 rounded-lg"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("logout")}</span>
              </Button>
            </div>
          </div>
        ) : userName ? (
          /* Collapsed user profile & actions stack */
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/10 shrink-0" title={userName}>
              {(userName ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full pt-3 border-t border-border/40">
              <EditProfileModal
                userName={userName ?? ""}
                role={role}
                collapsed={true}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Dynamic collapse trigger */}
        <div className="pt-2 flex justify-center border-t border-border/40">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-transform duration-200"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
