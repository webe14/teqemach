"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  role: "admin" | "collector" | "contributor";
  pageName?: string;
  userName?: string;
  userId?: string;
}

export function AppShell({ children, role, pageName, userName, userId }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar 
        role={role} 
        userName={userName} 
        collapsed={collapsed} 
        onToggleCollapse={() => setCollapsed(!collapsed)} 
      />

      {/* Mobile Header (simplified top bar) */}
      <MobileHeader role={role} pageName={pageName} userName={userName} userId={userId} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav role={role} userName={userName} />

      {/* Main content — offset for desktop sidebar */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        )}
      >
        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-20 h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-6">
          <h1 className="text-base font-semibold text-foreground">{pageName}</h1>
          <div className="flex items-center gap-2">
            {role === "collector" && userId && (
              <NotificationBell userId={userId} />
            )}
            <LanguageToggle />
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-8 pb-28 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}
