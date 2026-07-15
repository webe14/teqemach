"use client";

import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, Clock, CalendarDays, TrendingUp, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function ContributorDashboardClient({ 
  stats, 
  todayStr, 
  nextCycleStr, 
  group 
}: { 
  stats: any, 
  todayStr: string, 
  nextCycleStr: string, 
  group: any 
}) {
  const { t } = useLocale();

  const completionPct = stats.totalCycles > 0
    ? Math.round((stats.paidCycles / stats.totalCycles) * 100)
    : 0;

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("personalDashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("todayEc")}: <span className="font-semibold text-primary">{todayStr}</span>
        </p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Key metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t("amountSaved")}
          value={`ETB ${stats.amountSaved.toLocaleString()}`}
          subtitle={`${stats.paidCycles} ${t("paymentsMade")}`}
          icon={<Coins />}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatsCard
          title={t("daysRemaining")}
          value={stats.daysRemaining > 0 ? stats.daysRemaining : t("complete")}
          subtitle={`${t("outOf")} ${group?.total_days ?? "—"} ${t("totalDays")}`}
          icon={<Clock />}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatsCard
          title={t("nextCycleDate")}
          value={nextCycleStr}
          subtitle={t("ethiopianCalendar")}
          icon={<CalendarDays />}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Progress card */}
      <Card className="border-primary/20 gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("mySavingsProgress")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={completionPct === 100 ? "success" : "default"}>
                {completionPct === 100 ? `✓ ${t("complete")}` : `${completionPct}%`}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={completionPct}
            className="h-4"
            indicatorClassName={
              completionPct === 100
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-600"
            }
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {stats.paidCycles} {t("paid")}
            </span>
            <span>{stats.totalCycles} {t("totalCycles")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Group details */}
      {group && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myEqubGroupDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t("contributionAmount"), value: `ETB ${group.contribution_amount.toLocaleString()}` },
                { label: t("totalDays"), value: `${group.total_days} ${t("days")}` },
                { label: t("frequency"), value: t(group.frequency as any) || group.frequency },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
