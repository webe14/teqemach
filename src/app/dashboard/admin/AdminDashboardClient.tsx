"use client";

import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Users, TrendingUp, BarChart3, Shield } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function AdminDashboardClient({ 
  stats, 
  profiles, 
  collectors, 
  contributors 
}: { 
  stats: any, 
  profiles: any[], 
  collectors: any[], 
  contributors: any[] 
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-8 stagger-children">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("systemOverview")}</h1>
        <p className="text-muted-foreground mt-1">{t("systemOverviewDesc")}</p>
        <div className="ethiopian-divider mt-3 w-24" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title={t("totalCapital")}
          value={`ETB ${stats.totalCapital.toLocaleString()}`}
          subtitle={t("acrossActiveEqubs")}
          icon={<Coins />}
          gradient="from-amber-500 to-orange-600"
        />
        <StatsCard
          title={t("totalCollectors")}
          value={stats.totalCollectors}
          subtitle={t("activeEqubManagers")}
          icon={<Users />}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatsCard
          title={t("activeEqubs")}
          value={stats.activeEqubs}
          subtitle={t("runningSavingsGroups")}
          icon={<TrendingUp />}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      {/* Recent users table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t("registeredUsers")}</CardTitle>
              <CardDescription>{t("allSystemUsers")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="info">{collectors.length} {t("collectorsLabel")}</Badge>
              <Badge variant="success">{contributors.length} {t("contributorsLabel")}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("name")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("phone")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("role")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{t("joined")}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      {t("noUsersRegistered")}
                    </td>
                  </tr>
                )}
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{profile.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.phone_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          profile.role === "admin"
                            ? "default"
                            : profile.role === "collector"
                            ? "info"
                            : "success"
                        }
                      >
                        {t(profile.role as any) || profile.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-hover cursor-pointer group gradient-card border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{t("managementHub")}</p>
              <p className="text-sm text-muted-foreground">{t("registerNewUsers")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer group gradient-card border-amber-500/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-amber-600 transition-colors">{t("financialReports")}</p>
              <p className="text-sm text-muted-foreground">{t("viewSystemData")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
