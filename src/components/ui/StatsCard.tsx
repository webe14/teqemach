"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { gregorianToEthiopianString } from "@/lib/ethiopian-calendar";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/translations";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  gradient?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient = "from-indigo-500 to-violet-600",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-card border border-border p-6 card-hover",
        className
      )}
    >
      {/* Background gradient accent */}
      <div
        className={cn(
          "absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-10 bg-gradient-to-br",
          gradient
        )}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.value >= 0 ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
            gradient
          )}
        >
          <span className="text-white [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
      </div>
    </div>
  );
}
