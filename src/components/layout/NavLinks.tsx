"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  PlusCircle,
  BookOpen,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
};

const adminNavItems: NavItem[] = [
  { labelKey: "overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { labelKey: "managementHub", href: "/dashboard/admin/management", icon: Users },
  { labelKey: "financialReports", href: "/dashboard/admin/reports", icon: BarChart3 },
];

const collectorNavItems: NavItem[] = [
  { labelKey: "snapshotDashboard", href: "/dashboard/collector", icon: LayoutDashboard },
  { labelKey: "manageContributors", href: "/dashboard/collector/contributors", icon: Users },
  { labelKey: "equbGroups", href: "/dashboard/collector/groups", icon: PlusCircle },
  { labelKey: "globalReports", href: "/dashboard/collector/reports", icon: BarChart3 },
  { labelKey: "addRule", href: "/dashboard/collector/rules", icon: FileText },
];

const contributorNavItems: NavItem[] = [
  { labelKey: "personalDashboard", href: "/dashboard/contributor", icon: LayoutDashboard },
  { labelKey: "systemRules", href: "/dashboard/contributor/rules", icon: BookOpen },
  { labelKey: "paymentHistory", href: "/dashboard/contributor/history", icon: CreditCard },
];

interface NavLinksProps {
  role: "admin" | "collector" | "contributor";
  collapsed?: boolean;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function NavLinks({ role, collapsed = false, onNavigate, isMobile = false }: NavLinksProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const items =
    role === "admin"
      ? adminNavItems
      : role === "collector"
      ? collectorNavItems
      : contributorNavItems;

  const roleGradients = {
    admin: "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20 text-white",
    collector: "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20 text-white",
    contributor: "bg-gradient-to-r from-blue-600 to-cyan-600 shadow-md shadow-blue-500/20 text-white",
  };

  const roleTextHover = {
    admin: "hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20",
    collector: "hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20",
    contributor: "hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20",
  };

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive =
          item.href === `/dashboard/${role}`
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 group relative",
              isActive
                ? roleGradients[role]
                : isMobile 
                  ? "text-white hover:bg-white/10" 
                  : cn("text-muted-foreground", roleTextHover[role])
            )}
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-white" : isMobile ? "text-white" : "text-muted-foreground"
              )}
            />
            {!collapsed && (
              <span className="truncate">{t(item.labelKey)}</span>
            )}
            {isActive && !collapsed && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
