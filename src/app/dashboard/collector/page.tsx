import { getCurrentProfile } from "@/lib/actions/auth";
import { getCollectorStats } from "@/lib/actions/collector";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export const metadata = { title: "Collector Dashboard — Teqemach" };

export default async function CollectorDashboardPage() {
  // Use getCurrentProfile() — works for both Supabase Auth and custom cookie sessions
  const profile = await getCurrentProfile() as any;
  if (!profile) return null;

  const stats = await getCollectorStats(profile.id);
  const completionRate = stats.totalCycles > 0
    ? Math.round((stats.paidCycles / stats.totalCycles) * 100)
    : 0;

  return (
    <div className="space-y-8 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Snapshot Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your Equb group overview</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total Contributors"
          value={stats.totalContributors}
          subtitle="Active members in your groups"
          icon={<Users />}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatsCard
          title="Completed Cycles"
          value={stats.paidCycles}
          subtitle="Payments marked as paid"
          icon={<CheckCircle2 />}
          gradient="from-emerald-500 to-teal-600"
        />
        <StatsCard
          title="Pending Cycles"
          value={stats.totalCycles - stats.paidCycles}
          subtitle="Outstanding payments"
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
              Overall Collection Progress
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
            <span>{stats.paidCycles} paid</span>
            <span>{stats.totalCycles - stats.paidCycles} remaining</span>
            <span>{stats.totalCycles} total</span>
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
