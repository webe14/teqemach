import { getCurrentProfile } from "@/lib/actions/auth";
import { getContributorStats } from "@/lib/actions/contributor";
import { getCurrentEthiopianDate, addDaysToEthiopian, formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, Clock, CalendarDays, TrendingUp, CheckCircle2 } from "lucide-react";

export const metadata = { title: "My Dashboard — Teqemach" };

export default async function ContributorDashboardPage() {
  // Use getCurrentProfile() — works for both Supabase Auth and custom cookie sessions
  const profile = await getCurrentProfile() as any;
  if (!profile) return null;

  const stats = await getContributorStats(profile.id);

  // Compute next cycle date (Ethiopian Calendar)
  const today = getCurrentEthiopianDate();
  const nextCycle = addDaysToEthiopian(today, stats.daysRemaining > 0 ? 1 : 0);
  const nextCycleStr = formatEthiopianDate(nextCycle, "en");
  const todayStr = formatEthiopianDate(today, "en");

  const completionPct = stats.totalCycles > 0
    ? Math.round((stats.paidCycles / stats.totalCycles) * 100)
    : 0;

  const group = stats.group as { contribution_amount: number; total_days: number; frequency: string } | null | undefined;

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Personal Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Today (EC): <span className="font-semibold text-primary">{todayStr}</span>
        </p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Key metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Amount Saved"
          value={`ETB ${stats.amountSaved.toLocaleString()}`}
          subtitle={`${stats.paidCycles} payments made`}
          icon={<Coins />}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatsCard
          title="Days Remaining"
          value={stats.daysRemaining > 0 ? stats.daysRemaining : "Complete!"}
          subtitle={`Out of ${group?.total_days ?? "—"} total days`}
          icon={<Clock />}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatsCard
          title="Next Cycle Date"
          value={nextCycleStr}
          subtitle="Ethiopian Calendar"
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
              My Savings Progress
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={completionPct === 100 ? "success" : "default"}>
                {completionPct === 100 ? "✓ Complete" : `${completionPct}%`}
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
              {stats.paidCycles} paid
            </span>
            <span>{stats.totalCycles} total cycles</span>
          </div>
        </CardContent>
      </Card>

      {/* Group details */}
      {group && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Equb Group Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Contribution Amount", value: `ETB ${group.contribution_amount.toLocaleString()}` },
                { label: "Total Days", value: `${group.total_days} days` },
                { label: "Frequency", value: group.frequency.charAt(0).toUpperCase() + group.frequency.slice(1) },
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
