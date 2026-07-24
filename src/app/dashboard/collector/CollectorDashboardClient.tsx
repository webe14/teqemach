"use client";

import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function CollectorDashboardClient({ stats }: { stats: any }) {
  const { t } = useLocale();
  const completionRate = stats.totalCycles > 0
    ? Math.round((stats.paidCycles / stats.totalCycles) * 100)
    : 0;

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("snapshotDashboard")}</h1>
        <p className="text-muted-foreground mt-1">{t("equbGroupOverview")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t("totalContributors")}
          value={stats.totalContributors}
          subtitle={t("activeMembersInGroups")}
          icon={<Users />}
          gradient="from-indigo-500 to-violet-600"
          href="/dashboard/collector/contributors"
        />
        <StatsCard
          title={t("todayReport")}
          value={stats.todayPaid}
          subtitle={t("paymentsRecordedToday")}
          icon={<CheckCircle2 />}
          gradient="from-emerald-500 to-teal-600"
          href="/dashboard/collector/reports"
        />
        <StatsCard
          title={t("pendingCycles")}
          value={stats.totalCycles - stats.paidCycles}
          subtitle={t("outstandingPayments")}
          icon={<Clock />}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Progress card */}
      <Card className="border-primary/20 gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("overallCollectionProgress")}
            </CardTitle>
            <span className="text-2xl font-bold text-primary">{completionRate}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress
            value={completionRate}
            className="h-4"
            indicatorClassName={
              completionRate >= 80
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : completionRate >= 50
                ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            }
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{stats.paidCycles} {t("paid")}</span>
            <span>{stats.totalCycles - stats.paidCycles} {t("remaining")}</span>
            <span>{stats.totalCycles} {t("total")}</span>
          </div>

          {/* Mini progress bars per range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: "0–33%", color: "bg-rose-500", range: [0, 33] },
              { label: "34–66%", color: "bg-amber-500", range: [33, 66] },
              { label: "67–100%", color: "bg-emerald-500", range: [66, 100] },
            ].map((seg) => (
              <div key={seg.label} className="rounded-xl bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-2 w-2 rounded-full ${seg.color}`} />
                  <span className="text-xs text-muted-foreground">{seg.label}</span>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, ((completionRate - seg.range[0]) / (seg.range[1] - seg.range[0])) * 100))}
                  className="h-1.5"
                  indicatorClassName={seg.color}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
